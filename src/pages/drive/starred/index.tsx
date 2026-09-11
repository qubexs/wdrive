import Head from "next/head";
import GetFiles from "@/components/GetFiles";
import GetFolders from "@/components/GetFolders";
import FileHeader from "@/components/FileHeader";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useFetchAllFiles } from "@/hooks/fetchAllFiles";
import { useViewMode } from "@/hooks/useViewMode";
import { DotLoader } from "react-spinners";

export default function Index() {
  const [isFolder, setIsFolder] = useState(false);
  const [isFile, setIsFile] = useState(false);
  const [view] = useViewMode();
  const containerCls =
    view === "list"
      ? "flex flex-col gap-2 text-textC"
      : "flex flex-wrap justify-start gap-x-3 gap-y-5 text-textC";

  const { data: session } = useSession();

  // Fetch the full list so nested starred items are included
  const { entries: list, loading } = useFetchAllFiles(
    session?.user.id ?? "",
    session?.user.email ?? undefined,
  );

  useEffect(() => {
    // Determine if there are folders and files in the list
    const hasFolders = list.some(
      (item) => item.isFolder && item.isStarred && !item.isTrashed,
    );
    const hasFiles = list.some(
      (item) => !item.isFolder && item.isStarred && !item.isTrashed,
    );
    // Update the state based on the results
    setIsFolder(hasFolders);
    setIsFile(hasFiles);
  }, [list]);

  return (
    <>
      <Head>
        <title>Starred - Google Drive</title>
        <meta name="description" content="This is a google drive clone!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <FileHeader headerName={"Starred"} />
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
                        <GetFolders folderId="" select="starred" view={view} />
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
                        <GetFiles folderId="" select="starred" view={view} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // If there are no files or folders, display the empty state
                <div className="flex h-full flex-col items-center justify-center">
                  <Image
                    draggable={false}
                    src="/empty_state_starred.svg"
                    width={500}
                    height={500}
                    alt="empty-state"
                    className="w-48 object-cover object-center"
                  />
                  <h2 className="mb-4 text-2xl">No starred files</h2>
                  <p className="text-sm text-gray-600">
                    Add stars to things that you want to easily fine later
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
