import Head from "next/head";
import GetFiles from "@/components/GetFiles";
import GetFolders from "@/components/GetFolders";
import FileHeader from "@/components/FileHeader";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useFetchFiles } from "@/hooks/fetchFiles";
import { useViewMode } from "@/hooks/useViewMode";
import { DotLoader } from "react-spinners";
import DropZone from "@/components/DropZone";

export default function Home() {
  const [isFolder, setIsFolder] = useState(false);
  const [isFile, setIsFile] = useState(false);
  const [view] = useViewMode();
  const containerCls =
    view === "list"
      ? "flex flex-col gap-2 text-textC"
      : "flex flex-wrap justify-start gap-x-3 gap-y-5 text-textC";

  const { data: session } = useSession();

  // Fetch the list of files and folders
  const { list, loading } = useFetchFiles(
    "",
    session?.user.id ?? "",
    session?.user.email ?? undefined,
  );

  useEffect(() => {
    // Determine if there are folders and files in the list
    const hasFolders = list.some((item) => item.isFolder && !item.isTrashed);
    const hasFiles = list.some((item) => !item.isFolder && !item.isTrashed);

    // Update the state based on the results
    setIsFolder(hasFolders);
    setIsFile(hasFiles);
  }, [list]);

  return (
    <>
      <Head>
        <title>My Drive - Google Drive</title>
        <meta name="description" content="This is a google drive clone!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <FileHeader headerName={"My Drive"} />
        <DropZone folderId="">
        <div className="h-[75vh] w-full overflow-y-auto p-5">
          {/* If the list is loading, display the loading state */}
          {!isFile && !isFolder && loading ? (
            <div className="flex h-full items-center justify-center">
              <DotLoader color="#b8c2d7" size={60} />
            </div>
          ) : (
            <>
              {/* If there are files or folders, display them */}
              {isFile || isFolder ? (
                <>
                  {isFolder && (
                    // If there are folders, display them
                    <div className="mb-5 flex flex-col space-y-4">
                      <h2>Folders</h2>
                      <div className={containerCls}>
                        <GetFolders folderId="" select="" view={view} />
                      </div>
                    </div>
                  )}
                  {isFile && (
                    // If there are files, display them
                    <div className="mb-5 flex flex-col space-y-4">
                      <h2>Files</h2>
                      {view === "list" && (
                        <div className="flex items-center gap-3 px-3 text-xs font-medium text-textC/60">
                          <span className="w-6 shrink-0" />
                          <span className="min-w-0 flex-1">Name</span>
                          <span className="hidden w-24 shrink-0 text-right sm:block">
                            Size
                          </span>
                          <span className="h-6 w-6 shrink-0" />
                        </div>
                      )}
                      <div className={containerCls}>
                        <GetFiles folderId="" select="" view={view} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // If there are no files or folders, display the empty state
                <div className="flex h-full flex-col items-center justify-center">
                  <h2 className="mb-5 text-xl font-medium text-textC">
                    A place for all of your files
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
      </div>
    </>
  );
}
