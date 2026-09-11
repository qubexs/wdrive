import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const p = req.query.path as string[] | string | undefined;
  const rel = Array.isArray(p) ? p.join("/") : (p ?? "");
  // only allow google-drive-clone/* and sanitize
  if (!rel || !rel.startsWith("google-drive-clone/")) {
    return res.status(404).end();
  }
  const safe = rel.replace(/[^a-zA-Z0-9/_\-.]/g, "_");
  const filePath = path.join(process.cwd(), "public", safe);
  // download permission: session must have canDownload unless requesting own file or shared file
  // we allow unauthenticated if the file is shared (isShared) - do a lightweight DB check
  const publicIdLike = safe; // public/<safe> corresponds to FileEntry.publicId
  const downloadToken = typeof req.query.token === "string" ? req.query.token : "";
  let isSharedFile = false;
  if (downloadToken) {
    const shared = await db.fileEntry.findFirst({ where: { shareToken: downloadToken, isShared: true }, select: { publicId: true } });
    if (shared && shared.publicId === publicIdLike) isSharedFile = true;
  } else {
    // fallback: if no token, check if any shared entry matches this publicId
    const shared = await db.fileEntry.findFirst({ where: { publicId: publicIdLike, isShared: true }, select: { id: true } });
    if (shared) isSharedFile = true;
  }
  if (!isSharedFile) {
    const session = await getServerAuthSession({ req, res });
    if (!session?.user?.id) return res.status(401).end();
    if ((session as any)?.user?.isActive === false) return res.status(403).end();
    const role = (session as any)?.user?.role;
    const canDownload = (session as any)?.user?.canDownload !== false || role === "ADMIN" || session.user.email === "demo@local.dev";
    if (!canDownload) return res.status(403).end();
    // owners can always download own files; non-owners would have been 404 via guessing, but block cross-user guessing
    const ownerPrefix = `google-drive-clone/${session.user.id}/`;
    const isOwn = safe.startsWith(ownerPrefix);
    if (!isOwn && role !== "ADMIN" && session.user.email !== "demo@local.dev") {
      // check if file belongs to another user - deny unless admin
      // we allow it if shared (already handled) else 403
      return res.status(403).end();
    }
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return res.status(404).end();
  }
  const ext = path.extname(filePath).toLowerCase();
  const mime: Record<string,string> = {
    ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".gif":"image/gif",".webp":"image/webp",".ico":"image/x-icon",".svg":"image/svg+xml",
    ".mp4":"video/mp4",".mp3":"audio/mpeg",".pdf":"application/pdf",".txt":"text/plain",".zip":"application/zip",
    ".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",".doc":"application/msword",
    ".xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",".pptx":"application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".csv":"text/csv",".md":"text/markdown",".json":"application/json",
  };
  res.setHeader("Content-Type", mime[ext] ?? "application/octet-stream");
  // inline for docs so iframe can preview instead of download
  const inlineExts = new Set([".pdf",".txt",".csv",".md",".json",".jpg",".jpeg",".png",".gif",".webp",".svg",".mp4",".mp3"]);
  if (inlineExts.has(ext)) res.setHeader("Content-Disposition", `inline; filename="${path.basename(filePath)}"`);
  else res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}
