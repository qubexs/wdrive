import { USER_STORAGE_LIMIT_BYTES } from "@/constants/storage";
import { formatBytes } from "@/utils/formatBytes";

export { USER_STORAGE_LIMIT_BYTES };

const request = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Unable to update your files.");
  }
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
};

export const notifyFilesChanged = () => {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("drive-files-changed"));
};

export const getFiles = () => request<FileListProps[]>("/api/files");

export const getSharedFiles = () =>
  request<FileListProps[]>("/api/shared-files");

export const addFiles = async (
  fileLink: string,
  fileName: string,
  folderId: string,
  _userId: string,
  _userEmail?: string,
  publicId?: string,
  resourceType?: string,
  fileSize?: number,
) => {
  const entry = await request<FileListProps>("/api/files", {
    method: "POST",
    body: JSON.stringify({
      fileLink,
      fileName,
      folderId,
      publicId,
      resourceType,
      fileSize,
      isFolder: false,
    }),
  });
  notifyFilesChanged();
  return entry;
};

export const addFolder = async (payload: payloadProps) => {
  const entry = await request<FileListProps>("/api/files", {
    method: "POST",
    body: JSON.stringify({ ...payload, isFolder: true }),
  });
  notifyFilesChanged();
  return entry;
};

export const addSharedFolder = async (payload: payloadProps) => {
  const entry = await request<FileListProps>("/api/shared-files", {
    method: "POST",
    body: JSON.stringify({ ...payload, isFolder: true }),
  });
  notifySharedChanged();
  return entry;
};

export const addSharedFiles = async (
  fileLink: string,
  fileName: string,
  folderId: string,
  _userId: string,
  _userEmail?: string,
  publicId?: string,
  resourceType?: string,
  fileSize?: number,
) => {
  const entry = await request<FileListProps>("/api/shared-files", {
    method: "POST",
    body: JSON.stringify({
      fileLink,
      fileName,
      folderId,
      publicId,
      resourceType,
      fileSize,
      isFolder: false,
    }),
  });
  notifySharedChanged();
  return entry;
};

export const notifySharedChanged = () => {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("drive-shared-changed"));
};

const patchEntry = async (id: string, body: Record<string, unknown>) => {
  const entry = await request<FileListProps>(`/api/files/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  notifyFilesChanged();
  notifySharedChanged();
  return entry;
};

const allEntries = async (): Promise<FileListProps[]> => {
  const [own, shared] = await Promise.all([
    getFiles().catch(() => [] as FileListProps[]),
    getSharedFiles().catch(() => [] as FileListProps[]),
  ]);
  return [...own, ...shared];
};

const findConflict = (
  entries: FileListProps[],
  entry: Pick<
    FileListProps,
    "id" | "isFolder" | "fileName" | "folderName" | "sharedDrive"
  >,
  destinationId: string,
) =>
  entries.find(
    (candidate) =>
      candidate.id !== entry.id &&
      candidate.folderId === destinationId &&
      candidate.isFolder === entry.isFolder &&
      Boolean((candidate as any).sharedDrive) ===
        Boolean((entry as any).sharedDrive) &&
      (entry.isFolder
        ? candidate.folderName === entry.folderName
        : candidate.fileName === entry.fileName),
  );

export const deleteFile = async (
  fileId: string,
  _isFolder: boolean,
  _publicId?: string,
  _resourceType?: string,
) => {
  await request<void>(`/api/files/${fileId}`, { method: "DELETE" });
  notifyFilesChanged();
  notifySharedChanged();
};

export const replaceConflictingEntry = (entry: FileListProps) =>
  deleteFile(entry.id, entry.isFolder, entry.publicId, entry.resourceType);

export const renameFile = async (
  fileId: string,
  newName: string,
  isFolder: boolean,
  _userId: string,
  _userEmail?: string,
) => {
  const entries = await allEntries();
  const current = entries.find((entry) => entry.id === fileId);
  if (!current) return false;
  const candidate = {
    ...current,
    fileName: isFolder ? "" : newName,
    folderName: isFolder ? newName : "",
  };
  const conflict = findConflict(entries, candidate, current.folderId);
  if (conflict) {
    const confirmed = window.confirm(
      `"${newName}" already exists here. Replace it?`,
    );
    if (!confirmed) return false;
    await replaceConflictingEntry(conflict);
  }
  await patchEntry(fileId, { action: "rename", name: newName });
  return true;
};

export const starFile = (fileId: string, isStarred: boolean) =>
  patchEntry(fileId, { action: "star", isStarred });

export const trashFile = (fileId: string, isTrashed: boolean) =>
  patchEntry(fileId, { action: "trash", isTrashed });

export const updateShareSettings = (
  fileId: string,
  isShared: boolean,
  shareToken = "",
) => patchEntry(fileId, { action: "share", isShared, shareToken });

export const getUserUsageBytes = async (
  _userId: string,
  _userEmail?: string,
) => {
  const entries = await getFiles();
  return entries.reduce(
    (total, entry) =>
      total + (entry.isFolder ? 0 : Number(entry.fileSize ?? 0)),
    0,
  );
};

export const moveEntry = async (
  entry: FileListProps,
  destinationId: string,
  _userId: string,
  _userEmail?: string,
) => {
  const entries = await allEntries();
  const conflict = findConflict(entries, entry, destinationId);
  if (conflict) {
    const name = entry.isFolder ? entry.folderName : entry.fileName;
    const confirmed = window.confirm(
      `"${name}" already exists in the destination. Replace it?`,
    );
    if (!confirmed) return;
    await replaceConflictingEntry(conflict);
  }
  await patchEntry(entry.id, { action: "move", destinationId });
};

export const copyEntry = async (
  entry: FileListProps,
  destinationId: string,
  _userId: string,
  _userEmail?: string,
  storageLimitBytes?: number | null,
) => {
  const entries = await allEntries();
  const currentUsage = entries.reduce(
    (total, item) => total + (item.isFolder ? 0 : Number(item.fileSize ?? 0)),
    0,
  );
  const descendants = entry.isFolder
    ? entries.filter((item) => {
        let parentId = item.folderId;
        while (parentId) {
          if (parentId === entry.id) return true;
          parentId =
            entries.find((parent) => parent.id === parentId)?.folderId ?? "";
        }
        return false;
      })
    : [entry];
  const copySize = descendants.reduce(
    (total, item) => total + (item.isFolder ? 0 : Number(item.fileSize ?? 0)),
    0,
  );
  const limit = storageLimitBytes === undefined ? USER_STORAGE_LIMIT_BYTES : storageLimitBytes;
  if (limit !== null && currentUsage + copySize > limit) {
    window.alert(
      `This copy would exceed your ${formatBytes(limit)} storage limit.`,
    );
    return;
  }

  const conflict = findConflict(entries, entry, destinationId);
  if (conflict) {
    const name = entry.isFolder ? entry.folderName : entry.fileName;
    const confirmed = window.confirm(
      `"${name}" already exists in the destination. Replace it?`,
    );
    if (!confirmed) return;
    await replaceConflictingEntry(conflict);
  }
  await patchEntry(entry.id, { action: "copy", destinationId });
};

// Admin-only: move a My Drive file/folder into shared Drive.
// The server enforces admin rights (403 for non-admins).
export const moveToShared = async (
  entry: FileListProps,
  destinationId: string,
) => {
  const entries = await allEntries();
  const name = entry.isFolder ? entry.folderName : entry.fileName;
  const conflict = entries.find(
    (candidate) =>
      candidate.id !== entry.id &&
      candidate.folderId === destinationId &&
      candidate.isFolder === entry.isFolder &&
      Boolean((candidate as any).sharedDrive) === true &&
      (entry.isFolder
        ? candidate.folderName === name
        : candidate.fileName === name),
  );
  if (conflict) {
    const confirmed = window.confirm(
      `"${name}" already exists in shared Drive here. Replace it?`,
    );
    if (!confirmed) return;
    await replaceConflictingEntry(conflict);
  }
  await patchEntry(entry.id, { action: "moveToShared", destinationId });
};
