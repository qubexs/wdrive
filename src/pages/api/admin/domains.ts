import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/server/requireAdmin";
import { db } from "@/server/db";

// Runtime-managed email domain allowlist.
// Applies to NEW registrations only; existing users are never affected.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const domains = (db as any).allowedDomain;

  if (req.method === "GET") {
    const list = await domains.findMany({ orderBy: { domain: "asc" } });
    return res.status(200).json(list);
  }

  if (req.method === "POST") {
    const { domain } = (req.body ?? {}) as { domain?: string };
    const d = (domain ?? "").toLowerCase().trim();
    if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(d))
      return res.status(400).json({ error: "Invalid domain" });
    const exists = await domains.findUnique({ where: { domain: d } });
    if (exists) return res.status(409).json({ error: "Domain already listed" });
    const created = await domains.create({ data: { domain: d, isActive: true } });
    return res.status(201).json(created);
  }

  if (req.method === "PATCH") {
    const { id, isActive } = (req.body ?? {}) as { id?: string; isActive?: boolean };
    if (!id) return res.status(400).json({ error: "id required" });
    if (isActive === undefined) return res.status(400).json({ error: "isActive required" });
    const updated = await domains.update({ where: { id }, data: { isActive: !!isActive } });
    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    const id = (req.query.id as string) || (req.body as any)?.id;
    if (!id) return res.status(400).json({ error: "id required" });
    await domains.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
