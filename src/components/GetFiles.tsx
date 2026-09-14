import React, { useState } from "react";
import { useFetchFiles } from "@/hooks/fetchFiles";
import Image from "next/image";
import fileIcons from "@/components/fileIcons";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useSession } from "next-auth/react";
import FileDropDown from "./FileDropDown";
import { useFetchAllFiles } from "@/hooks/fetchAllFiles";
import Rename from "./Rename";
import PreviewModal from "./PreviewModal";
import { useViewMode, type ViewMode } from "@/hooks/useViewMode";
import { formatBytes } from "@/utils/formatBytes";

function GetFiles({
  folderId,
  select,
  view,
  sharedEntries,
  readOnly = false,
}: {
  folderId: string;
  select: string;
  view?: ViewMode;
  sharedEntries?: FileListProps[];
  readOnly?: boolean;
}) {
  const [openMenu, setOpenMenu] = useState("");
  const [renameToggle, setRenameToggle] = useState("");
  const [previewFile, setPreviewFile] = useState<FileListProps | null>(null);
  const [hookView] = useViewMode();
  const mode = view ?? hookView;

  const { data: session } = useSession();

  const userId = session?.user.id ?? "";
  const userEmail = session?.user.email ?? undefined;
  const { list: folderFiles } = useFetchFiles(folderId, userId, userEmail);
  const { entries: allFiles } = useFetchAllFiles(userId, userEmail);
  const privateList = select ? allFiles : folderFiles;
  const fileList = sharedEntries ?? privateList;

  const openFile = (fileLink: string) => {
    window.open(fileLink, "_blank");
  };

  const handleMenuToggle = (fileId: string) => {
    // Toggle the dropdown for the given file
    setRenameToggle("");
    setOpenMenu((prevOpenMenu) => (prevOpenMenu === fileId ? "" : fileId));
    window.dispatchEvent(
      new CustomEvent("drive-menu-open", {
        detail: { fileId, source: "files" },
      }),
    );
  };

  React.useEffect(() => {
    const handleCloseOtherMenus = (event: Event) => {
      const customEvent = event as CustomEvent<{
        fileId: string;
        source: string;
      }>;
      if (customEvent.detail?.source !== "files") {
        setOpenMenu("");
        setRenameToggle("");
      }
    };

    window.addEventListener(
      "drive-menu-open",
      handleCloseOtherMenus as EventListener,
    );
    return () => {
      window.removeEventListener(
        "drive-menu-open",
        handleCloseOtherMenus as EventListener,
      );
    };
  }, []);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ file: FileListProps }>;
      if (ce.detail?.file) setPreviewFile(ce.detail.file as FileListProps);
    };
    window.addEventListener("wdrive-preview", handler as EventListener);
    return () => window.removeEventListener("wdrive-preview", handler as EventListener);
  }, []);

  const list = fileList.map((file) => {
    // getting the icon for the file
    const icon =
      fileIcons[file.fileExtension as keyof typeof fileIcons] ??
      fileIcons["any"];

    const img = ["jpg", "ico", "webp", "png", "jpeg", "gif", "jfif"].includes(
      file.fileExtension ?? "",
    ) ? (
      <Image
        src={file.fileLink ?? ""}
        alt={file.fileName ?? "image"}
        height="500"
        width="500"
        draggable={false}
        className="h-full w-full rounded-sm object-cover object-center"
      />
    ) : file.fileExtension === "mp3" ? (
      <div className="flex flex-col items-center justify-center">
        <div className="h-24 w-24 ">{icon}</div>
        <audio controls className="w-44">
          <source src={file.fileLink ?? ""} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>
    ) : file.fileExtension === "mp4" ? (
      <video controls>
        <source src={file.fileLink ?? ""} type="video/mp4" />
        <div className="h-36 w-36 ">{icon}</div>
      </video>
    ) : (
      <div className="h-36 w-36 ">{icon}</div>
    );

    // set a condition for the files to be displayed
    let condition = !file?.isFolder && !(file?.isTrashed ?? false);
    if (select === "starred")
      condition =
        !file?.isFolder &&
        (file?.isStarred ?? false) &&
        !(file?.isTrashed ?? false);
    else if (select === "trashed")
      condition = !file?.isFolder && (file?.isTrashed ?? false);

    const canPreview = ["pdf","txt","md","csv","json","docx","doc","jpg","jpeg","png","gif","webp","ico","jfif","svg","mp4","mp3"].includes((file.fileExtension||"").toLowerCase());
    const previewTitle = canPreview ? "Click to preview" : "Double-click to open";
    const openPreview = () => canPreview && file.fileLink && setPreviewFile(file as FileListProps);
    const openExternal = () => file.fileLink && openFile(file.fileLink);

    const overlays = (
      <>
        {
          /* drop down */
          openMenu === file.id && (
            <FileDropDown
              file={{
                ...file,
                folderName: file.folderName ?? "",
                isFolder: file.isFolder ?? false,
                isStarred: file.isStarred ?? false,
                isTrashed: file.isTrashed ?? false,
                id: file.id ?? "",
                fileLink: file.fileLink ?? "",
                fileName: file.fileName ?? "",
                fileExtension: file.fileExtension ?? "",
                folderId: file.folderId ?? "",
              }}
              setOpenMenu={setOpenMenu}
              isFolderComp={false}
              select={select}
              folderId=""
              setRenameToggle={setRenameToggle}
              readOnly={readOnly}
            />
          )
        }
        {
          // rename toggle
          renameToggle === file.id && (
            <Rename
              setRenameToggle={setRenameToggle}
              fileId={file.id}
              isFolder={file.isFolder ?? false}
              fileName={file.fileName ?? ""}
              fileExtension={file.fileExtension ?? ""}
            />
          )
        }
      </>
    );

    if (mode === "list") {
      return (
        condition && (
          <div
            key={file.id}
            onClick={openPreview}
            onDoubleClick={openExternal}
            className="relative flex w-full cursor-pointer items-center gap-3 rounded-xl bg-darkC2 px-3 py-2.5 hover:bg-darkC"
            title={previewTitle}
          >
            <div className="h-6 w-6 shrink-0">{icon}</div>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-textC">
              {file.fileName}
            </span>
            <span className="hidden w-24 shrink-0 text-right text-xs text-textC/70 sm:block">
              {file.fileSize ? formatBytes(Number(file.fileSize)) : "—"}
            </span>
            <BsThreeDotsVertical
              onClick={(event: React.MouseEvent<SVGElement>) => {
                event.stopPropagation();
                if (file.id) {
                  handleMenuToggle(file.id);
                }
              }}
              className="h-6 w-6 shrink-0 cursor-pointer rounded-full p-1 hover:bg-[#ccc]"
            />
            {overlays}
          </div>
        )
      );
    }

    return (
      condition && (
        <div
          key={file.id}
          onClick={openPreview}
          onDoubleClick={openExternal}
          className="hover:cursor-alias"
          title={previewTitle}
        >
          <div
            className="flex w-full flex-col items-center justify-center
         overflow-visible rounded-xl bg-darkC2 px-2.5 hover:bg-darkC"
          >
            <div className="relative flex w-full items-center justify-between px-1 py-3">
              <div className="flex items-center space-x-4">
                <div className="h-6 w-6">{icon}</div>
                <span className="w-32 truncate text-sm font-medium text-textC">
                  {file.fileName}
                </span>
              </div>
              <BsThreeDotsVertical
                onClick={(event: React.MouseEvent<SVGElement>) => {
                  event.stopPropagation();
                  if (file.id) {
                    handleMenuToggle(file.id);
                  }
                }}
                className="h-6 w-6 cursor-pointer rounded-full p-1 hover:bg-[#ccc]"
              />
              {overlays}
            </div>
            <div className="flex h-44 w-48 items-center justify-center pb-2.5">
              {img}
            </div>
          </div>
        </div>
      )
    );
  });

  // the list of files
  return (
    <>
      {list}
      {previewFile && (
        <PreviewModal
          file={{
            fileLink: previewFile.fileLink ?? "",
            fileName: previewFile.fileName ?? "",
            fileExtension: previewFile.fileExtension ?? "",
            fileSize: (previewFile as any).fileSize,
          }}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}

export default GetFiles;
