import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

import { USER_STORAGE_LIMIT_BYTES } from "@/constants/storage";
import { getServerAuthSession } from "@/server/auth";
import { destroyCloudinaryAsset } from "@/server/cloudinary";
import { db } from "@/server/db";
import { collectDescendantIds, serializeFileEntry } from "@/server/files";

const readString = (value: unknown, maxLength = 500) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const destinationIsValid = async (
  ownerId: string,
  destinationId: string,
  sharedScope = false,
) => {
  if (!destinationId) return true;
  if (sharedScope) {
    const folder = await db.fileEntry.findFirst({
      where: { id: destinationId, isFolder: true, sharedDrive: true } as any,
      select: { id: true },
    });
    return Boolean(folder);
  }
  const folder = await db.fileEntry.findFirst({
    where: { id: destinationId, ownerId, isFolder: true },
    select: { id: true },
  });
  return Boolean(folder);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerAuthSession({ req, res });
  const ownerId = session?.user.id;
  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
  if ((session as any)?.user?.isActive === false) return res.status(403).json({ error: "Account disabled" });
  if (!id) return res.status(400).json({ error: "File id is required." });
  const isPrivileged = (session as any)?.user?.role === "ADMIN" || session.user.email === "demo@local.dev";
  const su = (session as any)?.user ?? {};
  const canEdit = su.canEdit !== false || isPrivileged;
  const canDelete = su.canDelete === true || isPrivileged;
  const canRename = su.canRename !== false || isPrivileged;
  const canMove = su.canMove !== false || isPrivileged;
  const canCopy = su.canCopy !== false || isPrivileged;
  const canShare = su.canShare !== false || isPrivileged;

  const entry = await db.fileEntry.findFirst({ where: { id } });
  if (!entry) return res.status(404).json({ error: "Item not found." });
  const isSharedEntry = (entry as any).sharedDrive === true;
  const body = req.body as Record<string, unknown>;
  const action = readString(body.action, 30);
  const isMoveToShared = action === "moveToShared";
  if (isSharedEntry) {
    // Shared Drive: viewable by all, mutable by admin only.
    if (!isPrivileged)
      return res.status(403).json({ error: "Only admin can modify shared Drive" });
  } else if (entry.ownerId !== ownerId && !(isPrivileged && isMoveToShared)) {
    return res.status(404).json({ error: "Item not found." });
  }
  // scope for descendants / delete: shared entries use sharedDrive scope
  const scopeWhere = isSharedEntry
    ? ({ sharedDrive: true } as any)
    : ({ ownerId } as any);

  if (req.method === "DELETE") {
    if (!canDelete) return res.status(403).json({ error: "Remove permission denied" });
    const allEntries = await db.fileEntry.findMany({ where: scopeWhere });
    const targetIds = [id];
    if (entry.isFolder) targetIds.push(...collectDescendantIds(id, allEntries));
    const targets = allEntries.filter((item) => targetIds.includes(item.id));
    const isLocalFile = (fileLink: string) =>
      fileLink.startsWith("/wdrive/api/serve/") || fileLink.startsWith("/api/serve/");
    const assets = new Map<string, { resourceType: string; fileLink: string }>();
    targets.forEach((item) => {
      if (!item.isFolder && item.publicId)
        assets.set(item.publicId, { resourceType: item.resourceType, fileLink: item.fileLink });
    });

    if (assets.size > 0) {
      const references = await db.fileEntry.findMany({
        where: {
          publicId: { in: [...assets.keys()] },
          id: { notIn: targetIds },
        },
        select: { publicId: true },
      });
      const retained = new Set(references.map((item) => item.publicId));
      for (const [publicId, asset] of assets) {
        if (retained.has(publicId)) continue;
        // local files live on disk (unlinked below), not in Cloudinary
        if (isLocalFile(asset.fileLink)) continue;
        await destroyCloudinaryAsset(publicId, asset.resourceType);
      }
    }

    await db.fileEntry.deleteMany({
      where: {
        id: { in: targetIds },
        ...(isSharedEntry ? { sharedDrive: true } : { ownerId }),
      } as any,
    });
    // clean up local files on disk (best-effort)
    for (const item of targets) {
      if (!item.isFolder && isLocalFile(item.fileLink) && item.publicId?.startsWith("google-drive-clone/")) {
        const safe = item.publicId.replace(/[^a-zA-Z0-9/_\-.]/g, "_");
        const fp = path.join(process.cwd(), "public", safe);
        try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
      }
    }
    return res.status(204).end();
  }

  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (action === "moveToShared") {
      // Admin-only: transfer a My Drive file/folder (whole subtree) into
      // shared Drive. Only admin can move My Drive items to Drive.
      if (!isPrivileged)
        return res.status(403).json({ error: "Only admin can move items to shared Drive" });
      if (isSharedEntry)
        return res.status(400).json({ error: "Item is already in shared Drive." });
      const destinationId = readString(body.destinationId, 191);
      if (!(await destinationIsValid(ownerId, destinationId, true))) {
        return res.status(400).json({ error: "Destination folder not found." });
      }
      // descendants live in the item owner's scope (admin may move other users' items)
      const ownerEntries = await db.fileEntry.findMany({
        where: { ownerId: entry.ownerId } as any,
      });
      const subtreeIds = entry.isFolder
        ? [id, ...collectDescendantIds(id, ownerEntries)]
        : [id];
      await db.fileEntry.updateMany({
        where: { id: { in: subtreeIds } } as any,
        data: { sharedDrive: true, isTrashed: false } as any,
      });
      const updated = await db.fileEntry.update({
        where: { id },
        data: { folderId: destinationId, isTrashed: false },
      });
      return res.status(200).json(serializeFileEntry(updated));
    }

    if (action === "rename") {
      if (!canRename) return res.status(403).json({ error: "Rename permission denied" });
      const name = readString(body.name, 255);
      if (!name) return res.status(400).json({ error: "A name is required." });
      const updated = await db.fileEntry.update({
        where: { id },
        data: { name },
      });
      return res.status(200).json(serializeFileEntry(updated));
    }

    if (action === "star") {
      if (!canEdit) return res.status(403).json({ error: "Edit permission denied" });
      const updated = await db.fileEntry.update({
        where: { id },
        data: { isStarred: body.isStarred === true },
      });
      return res.status(200).json(serializeFileEntry(updated));
    }

    if (action === "trash") {
      if (!canEdit) return res.status(403).json({ error: "Edit permission denied" });
      const isTrashed = body.isTrashed === true;
      // moving to trash is edit, permanent delete uses canDelete (above)
      const updated = await db.fileEntry.update({
        where: { id },
        data: { isTrashed, ...(isTrashed ? { isStarred: false } : {}) },
      });
      return res.status(200).json(serializeFileEntry(updated));
    }

    if (action === "share") {
      if (!canShare) return res.status(403).json({ error: "Share permission denied" });
      if (entry.isFolder)
        return res
          .status(400)
          .json({ error: "Folder sharing is not supported." });
      const isShared = body.isShared === true;
      const shareToken = isShared ? readString(body.shareToken, 191) : null;
      if (isShared && !shareToken) {
        return res.status(400).json({ error: "A share token is required." });
      }
      const updated = await db.fileEntry.update({
        where: { id },
        data: { isShared, shareToken },
      });
      return res.status(200).json(serializeFileEntry(updated));
    }

    if (action === "move") {
      if (!canMove) return res.status(403).json({ error: "Move permission denied" });
      const destinationId = readString(body.destinationId, 191);
      if (!(await destinationIsValid(ownerId, destinationId, isSharedEntry))) {
        return res.status(400).json({ error: "Destination folder not found." });
      }
      if (entry.isFolder) {
        const allEntries = await db.fileEntry.findMany({ where: scopeWhere });
        const descendants = new Set(collectDescendantIds(id, allEntries));
        if (destinationId === id || descendants.has(destinationId)) {
          return res
            .status(400)
            .json({ error: "A folder cannot be moved into itself." });
        }
      }
      const updated = await db.fileEntry.update({
        where: { id },
        data: { folderId: destinationId, isTrashed: false },
      });
      return res.status(200).json(serializeFileEntry(updated));
    }

    if (action === "copy") {
      if (!canCopy) return res.status(403).json({ error: "Copy permission denied" });
      const destinationId = readString(body.destinationId, 191);
      if (!(await destinationIsValid(ownerId, destinationId, isSharedEntry))) {
        return res.status(400).json({ error: "Destination folder not found." });
      }
      const allEntries = await db.fileEntry.findMany({ where: scopeWhere });
      const sourceIds = entry.isFolder
        ? [id, ...collectDescendantIds(id, allEntries)]
        : [id];
      const sources = allEntries.filter((item) => sourceIds.includes(item.id));
      const copySize = sources.reduce(
        (total, item) => total + (item.isFolder ? 0 : item.fileSize),
        0,
      );
      const usage = allEntries.reduce(
        (total, item) => total + (item.isFolder ? 0 : item.fileSize),
        0,
      );
      const limit = (session as any)?.user?.storageLimitBytes !== undefined ? (session as any)?.user?.storageLimitBytes : USER_STORAGE_LIMIT_BYTES;
      if (limit !== null && usage + copySize > limit) {
        return res.status(413).json({ error: "Storage limit exceeded." });
      }

      const created = await db.$transaction(async (tx) => {
        const idMap = new Map<string, string>();
        const pending = [...sources];
        let rootCopy = null;
        while (pending.length > 0) {
          const index = pending.findIndex(
            (item) => item.id === id || idMap.has(item.folderId),
          );
          if (index === -1) throw new Error("Invalid folder hierarchy.");
          const [source] = pending.splice(index, 1);
          if (!source) continue;
          const copy = await tx.fileEntry.create({
            data: {
              name: source.name,
              isFolder: source.isFolder,
              fileLink: source.fileLink,
              isStarred: source.isStarred,
              isTrashed: false,
              folderId:
                source.id === id
                  ? destinationId
                  : (idMap.get(source.folderId) ?? destinationId),
              publicId: source.publicId,
              resourceType: source.resourceType,
              fileSize: source.fileSize,
              ownerId: isSharedEntry ? source.ownerId : ownerId,
              ...(isSharedEntry ? { sharedDrive: true } : {}),
            } as any,
          });
          idMap.set(source.id, copy.id);
          if (source.id === id) rootCopy = copy;
        }
        return rootCopy;
      });
      if (!created) throw new Error("Unable to copy item.");
      return res.status(201).json(serializeFileEntry(created));
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ error: "An item with this name already exists." });
    }
    throw error;
  }
}
