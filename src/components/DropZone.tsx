import React, { useRef, useState } from "react";
import { useSession } from "next-auth/react";

import fileUpload from "@/API/FileUpload";
import { deleteFile, USER_STORAGE_LIMIT_BYTES } from "@/API/Files";
import { useFetchAllFiles } from "@/hooks/fetchAllFiles";
import { formatBytes } from "@/utils/formatBytes";

type Props = {
  folderId: string;
  children: React.ReactNode;
};

// Drag-and-drop file upload wrapper. Prevents the browser default
// (opening the dropped file in a new tab) and uploads into folderId.
export default function DropZone({ folderId, children }: Props) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const userEmail = session?.user?.email ?? undefined;
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const counter = useRef(0);

  const { entries: allFiles } = useFetchAllFiles(userId, userEmail);

  const role = (session?.user as any)?.role;
  const isAdminLike = role === "ADMIN" || session?.user?.email === "demo@local.dev";
  const canUpload = isAdminLike || (session?.user as any)?.canUpload !== false;
  const limit =
    (session?.user as any)?.storageLimitBytes !== undefined
      ? (session?.user as any)?.storageLimitBytes
      : USER_STORAGE_LIMIT_BYTES;
  const currentUsageBytes = allFiles.reduce((total, entry) => {
    if (entry.isFolder) return total;
    return total + Number(entry.fileSize ?? 0);
  }, 0);

  const handleFiles = async (files: File[]) => {
    if (!userId) return;
    if (!canUpload) {
      window.alert("Upload permission denied. Contact your admin.");
      return;
    }
    const total = files.reduce((sum, f) => sum + Number(f.size ?? 0), 0);
    if (limit !== null && currentUsageBytes + total > limit) {
      window.alert(`Upload would exceed your ${formatBytes(limit)} storage limit.`);
      return;
    }
    for (const file of files) {
      const conflict = allFiles.find(
        (entry) => !entry.isFolder && entry.folderId === folderId && entry.fileName === file.name,
      );
      if (conflict) {
        const ok = window.confirm(`"${file.name}" already exists here. Replace it?`);
        if (!ok) continue;
        await deleteFile(conflict.id, false, conflict.publicId, conflict.resourceType);
      }
      const uploadId =
        globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setUploads((prev) => [...prev, { id: uploadId, name: file.name, progress: 0 }]);
      try {
        await fileUpload(file, uploadId, setUploads, folderId, userId, userEmail ?? "");
        window.setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        }, 3000);
      } catch (e: any) {
        setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        window.alert(`Upload failed for "${file.name}": ${String(e.message || e)}`);
      }
    }
    window.dispatchEvent(new Event("drive-files-changed"));
  };

  return (
    <div
      className="relative"
      onDragEnter={(e) => {
        e.preventDefault();
        if (e.dataTransfer?.types?.includes("Files")) {
          counter.current += 1;
          setDragging(true);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        counter.current -= 1;
        if (counter.current <= 0) {
          counter.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        counter.current = 0;
        setDragging(false);
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length > 0) void handleFiles(files);
      }}
    >
      {children}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-[#1a73e8] bg-[#e8f0fe]/80">
          <p className="rounded-full bg-[#1a73e8] px-6 py-2 text-sm font-medium text-white shadow">
            Drop files to upload
          </p>
        </div>
      )}
      {uploads.length > 0 && (
        <div className="absolute bottom-4 right-4 z-50 w-64 rounded-xl bg-white p-3 text-xs shadow-lg">
          <p className="mb-2 font-medium text-textC">Uploading…</p>
          {uploads.map((u) => (
            <div key={u.id} className="mb-1">
              <div className="flex justify-between text-textC">
                <span className="max-w-[180px] truncate">{u.name}</span>
                <span>{u.progress ?? 0}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-darkC2">
                <div className="h-full bg-[#1a73e8]" style={{ width: `${u.progress ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
