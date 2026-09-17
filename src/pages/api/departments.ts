import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";

// Public list of active departments for autocomplete inputs
// (registration page is unauthenticated, so no admin guard here).
// Returns [{id, name}] ordered by name.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const departments = (db as any).department;
  if (!departments) return res.status(200).json([]);
  const list = await departments.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return res.status(200).json(list);
}
