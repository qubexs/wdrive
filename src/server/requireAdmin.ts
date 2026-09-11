import type { NextApiRequest, NextApiResponse } from "next";
import { getServerAuthSession } from "@/server/auth";
import { env } from "@/env.mjs";

export async function requireSession(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerAuthSession({ req, res });
  if (!session?.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  // isActive hard block (also handled in authorize, but enforce on every request)
  if ((session.user as any).isActive === false) {
    res.status(403).json({ error: "Account disabled" });
    return null;
  }
  return session;
}

export async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireSession(req, res);
  if (!session) return null;
  const email = (session.user.email ?? "").toLowerCase();
  const adminEmails = (env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const isHardAdmin = email === "demo@local.dev" || adminEmails.includes(email);
  const role = (session.user as any).role;
  if (role === "ADMIN" || isHardAdmin) return session;
  res.status(403).json({ error: "Admin only" });
  return null;
}

export type PermKey = "canDownload" | "canEdit" | "canDelete" | "canUpload" | "canRename" | "canMove" | "canCopy" | "canShare";

export function hasPerm(session: any, perm: PermKey) {
  const email = (session?.user?.email ?? "").toLowerCase();
  const adminEmails = (env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (email === "demo@local.dev" || adminEmails.includes(email) || session?.user?.role === "ADMIN") return true;
  return !!session?.user?.[perm];
}
