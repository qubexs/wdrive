import { useEffect, useMemo, useState } from "react";

import { getSharedFiles } from "@/API/Files";

let cache: FileListProps[] | null = null;
let inFlight: Promise<FileListProps[]> | null = null;
const subscribers = new Set<(entries: FileListProps[]) => void>();

const publish = (entries: FileListProps[]) => {
  cache = entries;
  subscribers.forEach((subscriber) => subscriber(entries));
};

const refresh = () => {
  if (inFlight) return inFlight;
  const promise = getSharedFiles()
    .then((entries) => {
      publish(entries);
      return entries;
    })
    .finally(() => {
      if (inFlight === promise) inFlight = null;
    });
  inFlight = promise;
  return promise;
};

export const useSharedFiles = () => {
  const [entries, setEntries] = useState<FileListProps[]>(cache ?? []);
  const [loading, setLoading] = useState(() => !cache);

  useEffect(() => {
    subscribers.add(setEntries);
    if (cache) {
      setEntries(cache);
      setLoading(false);
    } else {
      setLoading(true);
      void refresh()
        .then(() => setLoading(false))
        .catch(() => setLoading(false));
    }

    const handleChange = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void refresh().catch(console.error);
    };
    window.addEventListener("drive-shared-changed", handleChange);
    const interval = window.setInterval(handleChange, 60000);

    return () => {
      subscribers.delete(setEntries);
      window.removeEventListener("drive-shared-changed", handleChange);
      window.clearInterval(interval);
    };
  }, []);

  return { entries, loading };
};

export const useFetchSharedFiles = (folderId: string) => {
  const { entries, loading } = useSharedFiles();
  const list = useMemo(
    () => entries.filter((entry) => (entry.folderId ?? "") === folderId),
    [entries, folderId],
  );
  return { list, loading, entries };
};
