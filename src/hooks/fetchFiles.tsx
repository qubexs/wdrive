import { useMemo } from "react";

import { useFileEntries } from "@/hooks/useFileEntries";

export const useFetchFiles = (
  folderId: string,
  userId: string,
  userEmail?: string,
) => {
  void userEmail;
  const { entries, loading } = useFileEntries(userId);
  const list = useMemo(
    () => entries.filter((entry) => entry.folderId === folderId),
    [entries, folderId],
  );
  return { list, loading };
};
