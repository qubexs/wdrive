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
    const u = await db.user.findUnique({ where: { id: userId } });
    if (!u) return res.status(404).json({ error: "User not found" });
    if (userId === selfId) {
      return res.status(200).json({
        id: (u as any).id,
        email: (u as any).email,
        name: (u as any).name,
        image: (u as any).image ?? null,
        role: (u as any).role,
        department: (u as any).department ?? null,
        profile: (u as any).profile ?? null,
        icNumber: (u as any).icNumber ?? null,
      });
    }
    // public subset for other users (intranet directory)
    return res.status(200).json({
      id: (u as any).id,
      name: (u as any).name,
      image: (u as any).image ?? null,
      department: (u as any).department ?? null,
      email: (u as any).email,
    });
  }

  if (req.method === "PATCH") {
    if (userId !== selfId) return res.status(403).json({ error: "Can only edit own profile" });
    const { name, image, department, profile } = (req.body ?? {}) as {
      name?: string;
      image?: string;
      department?: string;
      profile?: string;
    };
    const data: any = {};
    if (name !== undefined) {
      const n = String(name).trim().slice(0, 100);
      if (!n) return res.status(400).json({ error: "Name required" });
      data.name = n;
    }
    if (department !== undefined) data.department = String(department).trim().slice(0, 100) || null;
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
      profile: updated.profile ?? null,
    });
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}
