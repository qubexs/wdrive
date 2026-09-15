import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/server/requireAdmin";

// Auth gate for the EDR console (http://10.44.145.220/edr).
// Used by intranet-nginx `auth_request` — checks the wdrive NextAuth session:
//   204 = logged in as wdrive ADMIN (allowed)
//   401 = not logged in (nginx redirects to /wdrive/auth/signin)
//   403 = logged in but not admin (nginx shows "admin only")
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  return res.status(204).end();
}
