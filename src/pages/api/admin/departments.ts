import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";

// Admin CRUD for departments.
// GET -> list with member counts. POST {name}. PATCH {id, name?, isActive?}.
// DELETE ?id[&reassignTo=] -> blocked with 409 if members exist unless reassignTo supplied.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const departments = (db as any).department;
  if (!departments) return res.status(500).json({ error: "Department model not migrated" });

  if (req.method === "GET") {
    const list = await departments.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });
    return res.status(200).json(
      list.map((d: any) => ({
        id: d.id,
        name: d.name,
        isActive: d.isActive,
        createdAt: d.createdAt,
        memberCount: d._count?.users ?? 0,
      })),
    );
  }

  if (req.method === "POST") {
    const { name } = (req.body ?? {}) as { name?: string };
    const n = (name ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
    if (!n) return res.status(400).json({ error: "Name required" });
    const dup = await departments.findFirst({ where: { name: { equals: n, mode: "insensitive" } } });
    if (dup) return res.status(409).json({ error: "Department already exists" });
    const created = await departments.create({ data: { name: n, isActive: true } });
    return res.status(201).json(created);
  }

  if (req.method === "PATCH") {
    const { id, name, isActive } = (req.body ?? {}) as { id?: string; name?: string; isActive?: boolean };
    if (!id) return res.status(400).json({ error: "id required" });
    const data: any = {};
    if (name !== undefined) {
      const n = String(name).trim().replace(/\s+/g, " ").slice(0, 100);
      if (!n) return res.status(400).json({ error: "Name required" });
      const dup = await departments.findFirst({
        where: { name: { equals: n, mode: "insensitive" }, NOT: { id } },
      });
      if (dup) return res.status(409).json({ error: "Department already exists" });
      data.name = n;
    }
    if (isActive !== undefined) data.isActive = !!isActive;
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "Nothing to update" });
    const updated = await departments.update({ where: { id }, data });
    // rename propagates automatically via FK; keep legacy string column in sync
    if (data.name) {
      await (db as any).user.updateMany({ where: { departmentId: id }, data: { department: data.name } });
    }
    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    const id = (req.query.id as string) || (req.body as any)?.id;
    const reassignTo = (req.query.reassignTo as string) || (req.body as any)?.reassignTo;
    if (!id) return res.status(400).json({ error: "id required" });
    const memberCount = await (db as any).user.count({ where: { departmentId: id } });
    if (memberCount > 0 && !reassignTo) {
      return res.status(409).json({ error: `Department has ${memberCount} member(s). Reassign first.`, memberCount });
    }
    if (memberCount > 0 && reassignTo) {
      const target = await departments.findUnique({ where: { id: reassignTo } });
      if (!target) return res.status(404).json({ error: "Reassign target not found" });
      if (reassignTo === id) return res.status(400).json({ error: "Cannot reassign to itself" });
      await (db as any).user.updateMany({ where: { departmentId: id }, data: { departmentId: reassignTo, department: target.name } });
    }
    await departments.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
