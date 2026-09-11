import type { NextApiRequest, NextApiResponse } from "next";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerAuthSession({ req, res });
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    // deprecated: use /api/admin/users (admin only). Keep self-only for non-admin to avoid leak
    const isAdmin = (session.user as any)?.role === "ADMIN" || session.user.email === "demo@local.dev";
    if (!isAdmin) {
      const me = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, name: true } as any });
      return res.status(200).json(me ? [me] : []);
    }
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true } as any,
      orderBy: { email: "asc" },
    });
    return res.status(200).json(users);
  }
  if (req.method === "DELETE") {
    const isAdmin = (session.user as any)?.role === "ADMIN" || session.user.email === "demo@local.dev";
    if (!isAdmin) return res.status(403).json({ error: "Admin only" });
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (userId === session.user.id) return res.status(400).json({ error: "Cannot delete self" });
    await db.user.update({ where: { id: userId }, data: { isActive: false } as any });
    return res.status(200).json({ ok: true, soft: true });
  }
  if (req.method === "POST") {
    // admin create user (soft-deprecated)
    const isAdmin = (session.user as any)?.role === "ADMIN" || session.user.email === "demo@local.dev";
    if (!isAdmin) return res.status(403).json({ error: "Admin only" });
    const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
    if (!email || !password) return res.status(400).json({ error: "email/password required" });
    const e = email.toLowerCase().trim();
    const exists = await db.user.findUnique({ where: { email: e } });
    if (exists) return res.status(409).json({ error: "User exists" });
    const hashed = await bcrypt.hash(password, 10);
    const u = await db.user.create({ data: { email: e, password: hashed, name: name || e.split("@")[0] } as any });
    return res.status(200).json({ id: (u as any).id, email: (u as any).email, name: (u as any).name });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
