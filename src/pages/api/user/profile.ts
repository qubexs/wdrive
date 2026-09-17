import type { NextApiRequest, NextApiResponse } from "next";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import fs from "fs";
import path from "path";

// Self-service profile. GET ?userId= returns full record for self,
// public subset for others. PATCH is self-only (name, image,
// department, profile). Password changes stay in /api/user/password.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerAuthSession({ req, res });
  const selfId = session?.user?.id;
  if (!selfId) return res.status(401).json({ error: "Unauthorized" });

  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  if (!userId) return res.status(400).json({ error: "userId required" });

  if (req.method === "GET") {
    const u = await (db.user.findUnique as any)({
      where: { id: userId },
      include: { departmentRef: { select: { id: true, name: true } } },
    });
    if (!u) return res.status(404).json({ error: "User not found" });
    const deptName = u.departmentRef?.name ?? u.department ?? null;
    const deptId = u.departmentRef?.id ?? u.departmentId ?? null;
    if (userId === selfId) {
      return res.status(200).json({
        id: u.id,
        email: u.email,
        name: u.name,
        image: u.image ?? null,
        role: u.role,
        department: deptName,
        departmentId: deptId,
        profile: u.profile ?? null,
        icNumber: u.icNumber ?? null,
      });
    }
    // public subset for other users (intranet directory)
    return res.status(200).json({
      id: u.id,
      name: u.name,
      image: u.image ?? null,
      department: deptName,
      departmentId: deptId,
      email: u.email,
    });
  }

  if (req.method === "PATCH") {
    if (userId !== selfId) return res.status(403).json({ error: "Can only edit own profile" });
    const { name, image, department, departmentId, profile } = (req.body ?? {}) as {
      name?: string;
      image?: string;
      department?: string;
      departmentId?: string;
      profile?: string;
    };
    const data: any = {};
    if (name !== undefined) {
      const n = String(name).trim().slice(0, 100);
      if (!n) return res.status(400).json({ error: "Name required" });
      data.name = n;
    }
    if (departmentId !== undefined || department !== undefined) {
      // Prefer departmentId (autocomplete selection); fall back to name lookup.
      let dept: any = null;
      if (departmentId) {
        dept = await (db as any).department.findFirst({ where: { id: departmentId, isActive: true } });
      } else if (typeof department === "string" && department.trim()) {
        const n = department.trim().replace(/\s+/g, " ");
        dept = await (db as any).department.findFirst({ where: { name: { equals: n, mode: "insensitive" }, isActive: true } });
      }
      if (!dept) return res.status(400).json({ error: "Please select a valid department from the list" });
      data.departmentId = dept.id;
      data.department = dept.name;
    }
    if (profile !== undefined) data.profile = String(profile).trim().slice(0, 500) || null;
    if (image !== undefined) {
      const img = String(image).trim().slice(0, 2048);
      if (img && !img.startsWith("/wdrive/api/serve/") && !img.startsWith("https://"))
        return res.status(400).json({ error: "Invalid image URL" });
      data.image = img || null;
      // best-effort cleanup of previous local avatar
      try {
        const cur = await db.user.findUnique({ where: { id: selfId }, select: { image: true } as any }) as any;
        const old = cur?.image as string | null;
        if (old && old.startsWith("/wdrive/api/serve/") && old !== img) {
          const rel = old.replace(/^\/wdrive\/api\/serve\//, "").replace(/[^a-zA-Z0-9/_\-.]/g, "_");
          const fp = path.join(process.cwd(), "public", rel);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
      } catch {}
    }
    const updated = await (db.user.update as any)({ where: { id: selfId }, data });
    return res.status(200).json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      image: updated.image ?? null,
      department: updated.department ?? null,
      departmentId: (updated as any).departmentId ?? null,
      profile: updated.profile ?? null,
    });
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}
