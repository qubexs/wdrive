import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";
import bcrypt from "bcryptjs";

// Public self-registration. Creates a PENDING account (isActive=false,
// isApproved=false) that an admin must approve in the dashboard.
// Email domain must exactly match an active AllowedDomain row.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, name, icNumber, department, profile } = (req.body ?? {}) as {
    email?: string;
    password?: string;
    name?: string;
    icNumber?: string;
    department?: string;
    profile?: string;
  };

  const e = (email ?? "").toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    return res.status(400).json({ error: "Invalid email" });
  if (!password || password.length < 4)
    return res.status(400).json({ error: "Password min 4 chars" });
  if (!(name ?? "").trim())
    return res.status(400).json({ error: "Name is required" });
  if (!(icNumber ?? "").trim())
    return res.status(400).json({ error: "IC number is required" });
  if (!(department ?? "").trim())
    return res.status(400).json({ error: "Department is required" });

  // exact domain match against active allowlist
  const domain = e.split("@")[1] ?? "";
  const allowed = await (db as any).allowedDomain.findFirst({
    where: { domain, isActive: true },
  });
  if (!allowed)
    return res.status(403).json({ error: "Email domain is not allowed. Contact your administrator." });

  const exists = await db.user.findUnique({ where: { email: e } });
  if (exists) return res.status(409).json({ error: "Account already exists. Please sign in." });

  const hashed = await bcrypt.hash(password, 10);
  const created = await (db.user.create as any)({
    data: {
      email: e,
      password: hashed,
      name: (name ?? "").trim().slice(0, 100) || e.split("@")[0],
      role: "USER",
      canDelete: false,
      isActive: false,
      isApproved: false,
      icNumber: (icNumber ?? "").trim().slice(0, 50),
      department: (department ?? "").trim().slice(0, 100),
      profile: (profile ?? "").trim().slice(0, 500),
    },
  });

  return res.status(201).json({ ok: true, email: created.email });
}
