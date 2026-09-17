import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === "GET") {
    const users = await (db.user.findMany as any)({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        canDownload: true,
        canEdit: true,
        canDelete: true,
        canUpload: true,
        canRename: true,
        canMove: true,
        canCopy: true,
        canShare: true,
        isActive: true,
        icNumber: true,
        department: true,
        departmentId: true,
        departmentRef: { select: { id: true, name: true } },
        profile: true,
        requestedAt: true,
        isApproved: true,
        storageLimitBytes: true,
      },
      orderBy: { email: "asc" },
    });
    // attach storage usage per user + normalized department fields
    const withUsage = await Promise.all(
      (users as any[]).map(async (u) => {
        const agg = await db.fileEntry.aggregate({
          where: { ownerId: u.id, isFolder: false },
          _sum: { fileSize: true },
          _count: true,
        });
        return {
          ...u,
          department: u.departmentRef?.name ?? u.department ?? null,
          departmentId: u.departmentRef?.id ?? u.departmentId ?? null,
          fileCount: (agg._count as any) ?? 0,
          storageUsed: (agg._sum as any)?.fileSize ?? 0,
        };
      })
    );
    return res.status(200).json(withUsage);
  }

  if (req.method === "POST") {
    const { email, password, name, role, canDownload, canEdit, canDelete, canUpload, canRename, canMove, canCopy, canShare, isActive, storageLimitBytes, departmentId } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
      canDownload?: boolean;
      canEdit?: boolean;
      canDelete?: boolean;
      canUpload?: boolean;
      canRename?: boolean;
      canMove?: boolean;
      canCopy?: boolean;
      canShare?: boolean;
      isActive?: boolean;
      storageLimitBytes?: number;
      departmentId?: string;
    };
    if (!email || !password) return res.status(400).json({ error: "email/password required" });
    const e = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return res.status(400).json({ error: "Invalid email" });
    if (password.length < 4) return res.status(400).json({ error: "Password min 4 chars" });
    const exists = await db.user.findUnique({ where: { email: e } });
    if (exists) return res.status(409).json({ error: "User exists" });
    const hashed = await bcrypt.hash(password, 10);
    const r = role === "ADMIN" ? "ADMIN" : "USER";
    let deptFields: any = {};
    if (departmentId) {
      const dept = await (db as any).department.findUnique({ where: { id: departmentId } });
      if (!dept) return res.status(400).json({ error: "Department not found" });
      deptFields = { departmentId: dept.id, department: dept.name };
    }
    const u = await db.user.create({
      data: {
        email: e,
        password: hashed,
        name: name || e.split("@")[0],
        role: r as any,
        ...deptFields,
        canDownload: canDownload ?? true,
        canEdit: canEdit ?? true,
        canDelete: canDelete ?? (r === "ADMIN"),
        canUpload: canUpload ?? true,
        canRename: canRename ?? true,
        canMove: canMove ?? true,
        canCopy: canCopy ?? true,
        canShare: canShare ?? true,
        isActive: isActive ?? true,
        ...(storageLimitBytes !== undefined ? { storageLimitBytes: storageLimitBytes === null ? null : Math.max(1024 * 1024, Math.floor(Number(storageLimitBytes))) } : {}),
      } as any,
    } as any);
    return res.status(200).json({ id: (u as any).id, email: (u as any).email, name: (u as any).name, role: (u as any).role });
  }

  if (req.method === "PATCH") {
    const { userId, name, role, canDownload, canEdit, canDelete, canUpload, canRename, canMove, canCopy, canShare, isActive, isApproved, departmentId, icNumber, profile } = req.body as {
      userId?: string;
      name?: string;
      role?: string;
      canDownload?: boolean;
      canEdit?: boolean;
      canDelete?: boolean;
      canUpload?: boolean;
      canRename?: boolean;
      canMove?: boolean;
      canCopy?: boolean;
      canShare?: boolean;
      isActive?: boolean;
      isApproved?: boolean;
      departmentId?: string | null;
      icNumber?: string | null;
      profile?: string | null;
    };
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (userId === session.user.id) {
      // prevent self-lockout of role but allow name/can toggles
      if (role && role !== (session.user as any).role) {
        return res.status(400).json({ error: "Cannot change own role" });
      }
      if (isActive === false) return res.status(400).json({ error: "Cannot deactivate self" });
    }
    const data: any = {};
    if (name !== undefined) {
      const n = String(name).trim().slice(0, 100);
      if (!n) return res.status(400).json({ error: "Name required" });
      data.name = n;
    }
    if (icNumber !== undefined) data.icNumber = icNumber === null ? null : String(icNumber).trim().slice(0, 50) || null;
    if (profile !== undefined) data.profile = profile === null ? null : String(profile).trim().slice(0, 500) || null;
    if (role !== undefined) data.role = role === "ADMIN" ? "ADMIN" : "USER";
    if (canDownload !== undefined) data.canDownload = !!canDownload;
    if (canEdit !== undefined) data.canEdit = !!canEdit;
    if (canDelete !== undefined) data.canDelete = !!canDelete;
    if (canUpload !== undefined) data.canUpload = !!canUpload;
    if (canRename !== undefined) data.canRename = !!canRename;
    if (canMove !== undefined) data.canMove = !!canMove;
    if (canCopy !== undefined) data.canCopy = !!canCopy;
    if (canShare !== undefined) data.canShare = !!canShare;
    if (isActive !== undefined) data.isActive = !!isActive;
    if (isApproved !== undefined) data.isApproved = !!isApproved;
    if (departmentId !== undefined) {
      if (departmentId === null || departmentId === "") {
        data.departmentId = null;
        data.department = null;
      } else {
        const dept = await (db as any).department.findUnique({ where: { id: departmentId } });
        if (!dept) return res.status(400).json({ error: "Department not found" });
        data.departmentId = dept.id;
        data.department = dept.name;
      }
    }
    const quota = (req.body as any)?.storageLimitBytes;
    if (quota !== undefined) {
      // null = unlimited
      if (quota === null) data.storageLimitBytes = null;
      else {
        const n = Math.floor(Number(quota));
        if (!Number.isSafeInteger(n) || n < 1024 * 1024) return res.status(400).json({ error: "Quota min 1 MB" });
        data.storageLimitBytes = n;
      }
    }
    const updated = await db.user.update({ where: { id: userId }, data } as any);
    return res.status(200).json({ ok: true, user: { id: (updated as any).id, role: (updated as any).role } });
  }

  if (req.method === "DELETE") {
    const { userId, hard, transferTo } = req.body as { userId?: string; hard?: boolean; transferTo?: string };
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (userId === session.user.id) return res.status(400).json({ error: "Cannot delete self" });
    // soft disable by default
    if (!hard) {
      await db.user.update({ where: { id: userId }, data: { isActive: false } as any });
      return res.status(200).json({ ok: true, soft: true });
    }
    // hard delete with optional transfer
    if (transferTo) {
      const target = await db.user.findUnique({ where: { id: transferTo } });
      if (!target) return res.status(404).json({ error: "transfer target not found" });
      await db.fileEntry.updateMany({ where: { ownerId: userId }, data: { ownerId: transferTo } });
    }
    await db.user.delete({ where: { id: userId } });
    return res.status(200).json({ ok: true, hard: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
