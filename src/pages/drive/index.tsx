import Head from "next/head";
import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

import GetFiles from "@/components/GetFiles";
import GetFolders from "@/components/GetFolders";
import FileHeader from "@/components/FileHeader";
import DropZone from "@/components/DropZone";
import fileUpload from "@/API/FileUpload";
import { addSharedFolder } from "@/API/Files";
import { useFetchSharedFiles } from "@/hooks/useSharedFiles";
import { useViewMode } from "@/hooks/useViewMode";
import { DotLoader } from "react-spinners";

export default function SharedDrive() {
  const [isFolder, setIsFolder] = useState(false);
  const [isFile, setIsFile] = useState(false);
  const [view] = useViewMode();
  const [folderName, setFolderName] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const containerCls =
    view === "list"
      ? "flex flex-col gap-2 text-textC"
      : "flex flex-wrap justify-start gap-x-3 gap-y-5 text-textC";

  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdminLike =
    role === "ADMIN" || session?.user?.email === "demo@local.dev";
  const userId = session?.user.id ?? "";
  const userEmail = session?.user.email ?? "";

  const { list, loading } = useFetchSharedFiles("");

  useEffect(() => {
    setIsFolder(list.some((item) => item.isFolder && !item.isTrashed));
    setIsFile(list.some((item) => !item.isFolder && !item.isTrashed));
  }, [list]);

  const handleCreateFolder = async () => {
    if (!isAdminLike) {
      window.alert("Only admin can add to shared Drive.");
      return;
    }
    const name = folderName.trim() || "Untitled folder";
    await addSharedFolder({
      folderName: name,
      isFolder: true,
      FileList: [],
      isStarred: false,
      isTrashed: false,
      folderId: "",
      userId,
      userEmail,
    });
    setFolderName("");
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!isAdminLike) {
      window.alert("Only admin can add to shared Drive.");
      e.target.value = "";
      return;
    }
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const uploadId =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setUploads((prev) => [...prev, { id: uploadId, name: file.name, progress: 0 }]);
      try {
        await fileUpload(file, uploadId, setUploads, "", userId, userEmail, undefined, true);
      } catch (err: any) {
        window.alert(`Upload failed for "${file.name}": ${String(err?.message || err)}`);
      }
    }
    e.target.value = "";
  };

  return (
    <>
      <Head>
        <title>Drive - Shared files</title>
        <meta name="description" content="Shared Drive visible to all users" />
        <link rel="icon" href="/wdrive/favicon.ico" />
      </Head>
      <div>
        <FileHeader
          headerName="Drive"
          breadcrumbs={[{ id: "", label: "Drive" }]}
          rootHref="/drive"
          sharedMode
        />
        {isAdminLike && (
          <div className="flex flex-wrap items-center gap-3 px-5 pt-1">
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="New shared folder"
              className="rounded-lg border border-textC/30 px-3 py-1.5 text-sm"
            />
            <button
              onClick={handleCreateFolder}
              className="rounded-full bg-[#1a73e8] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1557b0]"
            >
              + New folder
            </button>
            <label className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-sm shadow hover:bg-darkC">
              + Add files
              <input type="file" multiple className="hidden" onChange={handleUpload} />
            </label>
          </div>
        )}
        {!isAdminLike && (
          <p className="px-5 pt-1 text-xs text-textC/60">
            Shared Drive is read-only. Only admin can add, move, delete or rename here.
          </p>
        )}
        <DropZone folderId="" readOnly={!isAdminLike} sharedMode>
          <div className="h-[75vh] w-full overflow-y-auto p-5">
            {!isFile && !isFolder && loading ? (
              <div className="flex h-full items-center justify-center">
                <DotLoader color="#b8c2d7" size={60} />
              </div>
            ) : (
              <>
                {isFile || isFolder ? (
                  <>
                    {isFolder && (
                      <div className="mb-5 flex flex-col space-y-4">
                        <h2>Folders</h2>
                        <div className={containerCls}>
                          <GetFolders
                            folderId=""
                            select=""
                            view={view}
                            sharedEntries={list}
                            readOnly
                            sharedMode
                          />
                        </div>
                      </div>
                    )}
                    {isFile && (
                      <div className="mb-5 flex flex-col space-y-4">
                        <h2>Files</h2>
                        <div className={containerCls}>
                          <GetFiles
                            folderId=""
                            select=""
                            view={view}
                            sharedEntries={list}
                            readOnly
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center">
                    <h2 className="mb-5 text-xl font-medium text-textC">
                      Shared Drive is empty
                    </h2>
                    <Image
                      draggable={false}
                      src="/empty_state_drive.png"
                      width={500}
                      height={500}
                      alt="empty-state"
                      className="w-full max-w-2xl object-cover object-center"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </DropZone>
        {uploads.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50 w-64 rounded-xl bg-white p-3 text-xs shadow-lg">
            {uploads.map((u) => (
              <div key={u.id} className="mb-1">
                <div className="flex justify-between">
                  <span className="max-w-[180px] truncate">{u.name}</span>
                  <span>{u.progress ?? 0}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <span className="hidden">{uploads.length}</span>
      </div>
    </>
  );
}
