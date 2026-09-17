import React from "react";
import { FiShare2 } from "react-icons/fi";
import { HiOutlineArrowsExpand } from "react-icons/hi";
import {
  MdContentCopy,
  MdDriveFileRenameOutline,
  MdDriveFileMove,
  MdOutlineRestore,
  MdStarBorder,
  MdStarRate,
} from "react-icons/md";
import { RiDeleteBin6Line } from "react-icons/ri";
import { TbDownload } from "react-icons/tb";
import {
  deleteFile,
  moveEntry,
  moveToShared,
  copyEntry,
  starFile,
  trashFile,
} from "@/API/Files";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import TransferDialog from "./TransferDialog";
import ShareDialog from "./ShareDialog";

function FileDropDown({
  file,
  setOpenMenu,
  select,
  isFolderComp,
  folderId,
  setRenameToggle,
  readOnly = false,
}: FileDropDownProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdminLike = role === "ADMIN" || session?.user?.email === "demo@local.dev";
  // Shared Drive: viewable by all, mutable by admin only.
  const sharedReadOnly = (readOnly || (file as any).sharedDrive === true) && !isAdminLike;
  const su = (session?.user as any) ?? {};
  const canDownload = isAdminLike || su.canDownload !== false;
  const canEdit = !sharedReadOnly && (isAdminLike || su.canEdit !== false);
  const canDelete = !sharedReadOnly && (isAdminLike || su.canDelete === true);
  const canRename = !sharedReadOnly && (isAdminLike || su.canRename !== false);
  const canMove = !sharedReadOnly && (isAdminLike || su.canMove !== false);
  const canCopy = !sharedReadOnly && (isAdminLike || su.canCopy !== false);
  const canShare = !sharedReadOnly && (isAdminLike || su.canShare !== false);
  const denied = " (no permission)";
  const deniedCls = "my-2 flex items-center space-x-3 px-3 py-1.5 text-gray-400";
  const [transferMode, setTransferMode] = React.useState<
    "move" | "copy" | "moveToShared" | ""
  >("");
  const isMyDriveItem = (file as any).sharedDrive !== true;
  const [shareOpen, setShareOpen] = React.useState(false);
  const closeMenu = () => setOpenMenu("");

  const openFile = (fileLink: string) => {
    // Open the file in a new tab
    window.open(fileLink, "_blank");
  };
  const previewFile = () => {
    window.dispatchEvent(new CustomEvent("wdrive-preview", { detail: { file } }));
    closeMenu();
  };

  const downloadFile = async (fileLink: string, downloadName: string) => {
    try {
      const response = await fetch(fileLink);
      if (!response.ok) {
        throw new Error("Unable to download file.");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to download file.",
      );
    }
  };

  return (
    <>
      <section
        onClick={(event) => event.stopPropagation()}
        className="absolute right-0 top-9 z-10 max-h-72 w-52 overflow-y-auto rounded-md border bg-white shadow-sm shadow-[#777]"
      >
        {select !== "trashed" ? (
          <>
            <div
              onClick={() => {
                if (!isFolderComp) previewFile();
                else {
                  closeMenu();
                  const target =
                    (file as any).sharedDrive === true
                      ? "/drive/shared/" + folderId
                      : "/drive/folders/" + folderId;
                  void router.push(target);
                }
              }}
              className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
            >
              <HiOutlineArrowsExpand className="h-5 w-5" />
              <span className="text-sm">Preview</span>
            </div>
            {!isFolderComp && (
              <div
                onClick={() => {
                  closeMenu();
                  openFile(file.fileLink);
                }}
                className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
              >
                <HiOutlineArrowsExpand className="h-5 w-5" />
                <span className="text-sm">Open in new tab</span>
              </div>
            )}
            {canDownload && !isFolderComp && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  void downloadFile(file.fileLink, file.fileName);
                }}
                className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
              >
                <TbDownload className="h-5 w-5" />
                <span className="text-sm">Download</span>
              </button>
            )}
            {!canDownload && !isFolderComp && (
              <div className="my-2 flex items-center space-x-3 px-3 py-1.5 text-gray-400">
                <TbDownload className="h-5 w-5" />
                <span className="text-sm">Download (no permission)</span>
              </div>
            )}

            {canRename ? (
              <div
                onClick={() => {
                  closeMenu();
                  setRenameToggle(file.id);
                }}
                className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
              >
                <MdDriveFileRenameOutline className="h-5 w-5" />
                <span className="text-sm">Rename</span>
              </div>
            ) : (
              <div className={deniedCls}>
                <MdDriveFileRenameOutline className="h-5 w-5" />
                <span className="text-sm">Rename{denied}</span>
              </div>
            )}
            {canEdit ? (
              <div
                onClick={() => {
                  closeMenu();
                  void starFile(file.id, !file.isStarred);
                }}
                className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
              >
                {!file.isStarred ? (
                  <MdStarBorder className="h-5 w-5" />
                ) : (
                  <MdStarRate className="h-5 w-5" />
                )}
                <span className="text-sm">Add to starred</span>
              </div>
            ) : (
              <div className={deniedCls}>
                {!file.isStarred ? (
                  <MdStarBorder className="h-5 w-5" />
                ) : (
                  <MdStarRate className="h-5 w-5" />
                )}
                <span className="text-sm">Add to starred{denied}</span>
              </div>
            )}
            {canMove ? (
              <div
                onClick={() => setTransferMode("move")}
                className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
              >
                <MdDriveFileMove className="h-5 w-5" />
                <span className="text-sm">Move to</span>
              </div>
            ) : (
              <div className={deniedCls}>
                <MdDriveFileMove className="h-5 w-5" />
                <span className="text-sm">Move to{denied}</span>
              </div>
            )}
            {canCopy ? (
              <div
                onClick={() => setTransferMode("copy")}
                className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
              >
                <MdContentCopy className="h-5 w-5" />
                <span className="text-sm">Make a copy to</span>
              </div>
            ) : (
              <div className={deniedCls}>
                <MdContentCopy className="h-5 w-5" />
                <span className="text-sm">Make a copy to{denied}</span>
              </div>
            )}
            {isMyDriveItem && isAdminLike && (
              <div
                onClick={() => setTransferMode("moveToShared")}
                className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
              >
                <MdDriveFileMove className="h-5 w-5" />
                <span className="text-sm">Move to Drive</span>
              </div>
            )}
            {isMyDriveItem && !isAdminLike && (
              <div className={deniedCls} title="Only admin can move My Drive items to shared Drive">
                <MdDriveFileMove className="h-5 w-5" />
                <span className="text-sm">Move to Drive (admin only)</span>
              </div>
            )}
            {!isFolderComp && canShare && (
              <div
                onClick={() => {
                  setShareOpen(true);
                }}
                className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
              >
                <FiShare2 className="h-5 w-5" />
                <span className="text-sm">Copy link</span>
              </div>
            )}
            {!isFolderComp && !canShare && (
              <div className={deniedCls}>
                <FiShare2 className="h-5 w-5" />
                <span className="text-sm">Copy link{denied}</span>
              </div>
            )}
            {canEdit ? (
              <div
                onClick={() => {
                  closeMenu();
                  void trashFile(file.id, true);
                }}
                className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
              >
                <RiDeleteBin6Line className="h-5 w-5" />
                <span className="text-sm">Move to bin</span>
              </div>
            ) : (
              <div className={deniedCls}>
                <RiDeleteBin6Line className="h-5 w-5" />
                <span className="text-sm">Move to bin{denied}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div
              onClick={() => {
                if (!canEdit) { window.alert("Edit permission denied"); return; }
                closeMenu();
                void trashFile(file.id, false);
              }}
              className={`my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd] ${!canEdit ? "opacity-50" : ""}`}
            >
              <MdOutlineRestore className="h-5 w-5" />
              <span className="text-sm">Restore</span>
            </div>
            {canDelete ? (
              <div
                onClick={() => {
                  closeMenu();
                  void deleteFile(
                    file.id,
                    file.isFolder,
                    file.publicId,
                    file.resourceType,
                  );
                }}
                className="my-2 flex items-center space-x-3 px-3 py-1.5 hover:cursor-pointer hover:bg-[#ddd]"
              >
                <RiDeleteBin6Line className="h-5 w-5" />
                <span className="text-sm">Delete forever</span>
              </div>
            ) : (
              <div className="my-2 flex items-center space-x-3 px-3 py-1.5 text-gray-400">
                <RiDeleteBin6Line className="h-5 w-5" />
                <span className="text-sm">Delete forever (no permission)</span>
              </div>
            )}
          </>
        )}
      </section>
      {transferMode && session?.user.id && (
        <TransferDialog
          item={file}
          mode={transferMode}
          targetScope={transferMode === "moveToShared" ? "shared" : undefined}
          onClose={() => {
            setTransferMode("");
            closeMenu();
          }}
          onConfirm={async (destinationId) => {
            if (transferMode === "move") {
              await moveEntry(
                file,
                destinationId,
                session.user.id,
                session.user.email ?? undefined,
              );
              return;
            }
            if (transferMode === "moveToShared") {
              await moveToShared(file, destinationId);
              return;
            }

            await copyEntry(
              file,
              destinationId,
              session.user.id,
              session.user.email ?? undefined,
              (session.user as any)?.storageLimitBytes,
            );
          }}
        />
      )}
      {shareOpen && !isFolderComp && (
        <ShareDialog
          file={file}
          onClose={() => {
            setShareOpen(false);
            closeMenu();
          }}
        />
      )}
    </>
  );
}

export default FileDropDown;
