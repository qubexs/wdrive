import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const [userCount, fileAgg, totalFiles] = await Promise.all([
    db.user.count(),
    db.fileEntry.aggregate({ where: { isFolder: false }, _sum: { fileSize: true } }),
    db.fileEntry.count({ where: { isFolder: false } }),
  ]);
  const activeUsers = await db.user.count({ where: { isActive: true } as any });
  const adminCount = await db.user.count({ where: { role: "ADMIN" } as any });
  return res.status(200).json({
    userCount,
    activeUsers,
    adminCount,
    totalFiles,
    totalStorage: (fileAgg._sum as any)?.fileSize ?? 0,
  });
}
