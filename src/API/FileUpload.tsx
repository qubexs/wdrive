import type { Dispatch, SetStateAction } from "react";
import { addFiles } from "@/API/Files";

const fileUpload = (
  file: File,
  uploadId: string,
  setUploads: Dispatch<SetStateAction<UploadItem[]>>,
  parentId: string,
  userId: string,
  userEmail?: string,
  fileNameOverride?: string,
) => {
  const upload = async () => {
    try {
      const folder = `google-drive-clone/${userId}`;
      let signData: { signature: string; timestamp: number; apiKey: string; cloudName: string } | null = null;
      let useLocal = false;
      try {
        const signResponse = await fetch("/api/cloudinary/sign-upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ folder }),
        });
        if (!signResponse.ok) {
          useLocal = true;
        } else {
          const jd = (await signResponse.json()) as
            | { signature: string; timestamp: number; apiKey: string; cloudName: string }
            | { error: string };
          if ("error" in jd) useLocal = true;
          else signData = jd;
        }
      } catch {
        useLocal = true;
      }

      const isDemo = useLocal || !signData || !signData.cloudName || signData.cloudName === "demo" || signData.apiKey === "123456" || signData.apiKey === "local" || signData.signature === "local";
      if (isDemo) {
        // local upload via base64 - browser safe (no Node Buffer)
        const buffer = await file.arrayBuffer();
        let base64: string;
        // @ts-ignore Buffer available only in Node, fallback to browser
        if (typeof Buffer !== "undefined" && Buffer.from) base64 = Buffer.from(buffer).toString("base64");
        else {
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
          base64 = btoa(binary);
        }
        const localRes = await fetch("/api/upload/local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: fileNameOverride ?? file.name,
            folder,
            dataBase64: base64,
            mimeType: file.type,
          }),
        });
        if (!localRes.ok) {
          const err = (await localRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(err?.error || "Local upload failed.");
        }
        const localResult = (await localRes.json()) as {
          public_id: string;
          resource_type: string;
          secure_url: string;
        };
        // reuse same success path as Cloudinary
        await addFiles(
          localResult.secure_url,
          fileNameOverride ?? file.name,
          parentId,
          userId,
          userEmail,
          localResult.public_id,
          localResult.resource_type,
          Number(file.size ?? 0),
        );
        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === uploadId ? { ...upload, progress: 100, fileLink: localResult.secure_url } : upload,
          ),
        );
        return;
      }

      // non-local = real cloudinary
      const { signature, timestamp, apiKey, cloudName } = signData!;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;

          const progress = Math.round((event.loaded / event.total) * 100);
          setUploads((prev) =>
            prev.map((upload) =>
              upload.id === uploadId ? { ...upload, progress } : upload,
            ),
          );
        };

        xhr.onload = async () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error("Cloudinary upload failed."));
            return;
          }

          const result = JSON.parse(xhr.responseText) as {
            public_id: string;
            resource_type: string;
            secure_url: string;
          };

          try {
            await addFiles(
              result.secure_url,
              fileNameOverride ?? file.name,
              parentId,
              userId,
              userEmail,
              result.public_id,
              result.resource_type,
              Number(file.size ?? 0),
            );

            setUploads((prev) =>
              prev.map((upload) =>
                upload.id === uploadId
                  ? { ...upload, progress: 100, fileLink: result.secure_url }
                  : upload,
              ),
            );
            resolve();
          } catch (metadataError) {
            await fetch("/api/cloudinary/destroy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                publicId: result.public_id,
                resourceType: result.resource_type,
              }),
            }).catch(console.error);
            reject(metadataError);
          }
        };

        xhr.onerror = () => reject(new Error("Cloudinary upload failed."));
        xhr.send(formData);
      });
    } catch (error) {
      setUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
      throw error;
    }
  };

  return upload();
};

export default fileUpload;
