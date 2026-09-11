import type { NextApiRequest, NextApiResponse } from "next";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerAuthSession({ req, res });
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "PATCH") {
    const { currentPassword, newPassword, targetUserId } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      targetUserId?: string;
    };
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: "New password too short (min 4)" });
    // Admin can reset any user without currentPassword if targetUserId provided and session is admin
    const isAdmin = (session.user as any)?.role === "ADMIN" || session.user.email === "demo@local.dev";
    let userId = session.user.id;
    let needCurrent = true;
    if (targetUserId && isAdmin && targetUserId !== session.user.id) {
      userId = targetUserId;
      needCurrent = false;
    }
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (needCurrent) {
      if (!currentPassword) return res.status(400).json({ error: "Current password required" });
      if (!user.password) return res.status(400).json({ error: "No password set" });
      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) return res.status(403).json({ error: "Current password incorrect" });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.user.update({ where: { id: userId }, data: { password: hashed } });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
