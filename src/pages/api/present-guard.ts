import type { NextApiRequest, NextApiResponse } from "next";
import { requireSession } from "@/server/requireAdmin";

// Auth gate for the Presentation app (http://10.44.145.220/present).
// Used by intranet-nginx `auth_request` — checks the wdrive NextAuth session:
//   204 = logged in wdrive user (allowed, any role)
//   401 = not logged in (nginx redirects to /wdrive/auth/signin)
//   403 = logged in but disabled (nginx shows "disabled")
// On 204 the wdrive identity is exposed via response headers so nginx can
// forward it to present-app as X-Remote-User / X-Remote-Name (SSO).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireSession(req, res);
  if (!session) return;
  res.setHeader("X-User-Email", (session.user.email ?? "").toLowerCase());
  res.setHeader("X-User-Name", (session.user.name ?? "").slice(0, 100));
  res.setHeader("X-User-Role", (session.user as { role?: string }).role ?? "USER");
  return res.status(204).end();
}
