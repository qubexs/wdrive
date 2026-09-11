import type { NextApiRequest, NextApiResponse } from "next";
import { getServerAuthSession } from "@/server/auth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const config = { api: { bodyParser: { sizeLimit: "100mb" } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" } as any);
  const session = await getServerAuthSession({ req, res });
  if (!session?.user.id) return res.status(401).json({ error: "Unauthorized" } as any);

  try {
    const { fileName, folder, dataBase64, mimeType } = req.body as {
      fileName?: string;
      folder?: string;
      dataBase64?: string;
      mimeType?: string;
    };
    if (!fileName || !dataBase64) return res.status(400).json({ error: "Missing file" } as any);

    const userId = session.user.id;
    const safeFolder = (folder || `google-drive-clone/${userId}`).replace(/[^a-zA-Z0-9/_-]/g, "_");
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const dir = path.join(process.cwd(), "public", safeFolder);
    await fs.mkdir(dir, { recursive: true });

    // unique name to avoid overwrite
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    const unique = `${base}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const filePath = path.join(dir, unique);
    const buffer = Buffer.from(dataBase64, "base64");
    await fs.writeFile(filePath, buffer);

    const publicId = `${safeFolder}/${unique}`;
    // serve via API to avoid Next public 404 for dynamically created files
    const secureUrl = `/wdrive/api/serve/${safeFolder}/${unique}`;
    const resourceType = mimeType?.startsWith("image/") ? "image" : mimeType?.startsWith("video/") ? "video" : "raw";

    return res.status(200).json({ public_id: publicId, resource_type: resourceType, secure_url: secureUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Local upload failed" } as any);
  }
}
