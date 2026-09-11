import { useCallback, useEffect, useState } from "react";

export type ViewMode = "grid" | "list";

const STORAGE_KEY = "wdrive-view-mode";
const EVENT_NAME = "wdrive-view-mode-changed";

function readMode(): ViewMode {
  if (typeof window === "undefined") return "grid";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "list"
      ? "list"
      : "grid";
  } catch {
    return "grid";
  }
}

/**
 * Shared grid/list view mode, persisted to localStorage and
 * broadcast so header toggle, pages and file lists stay in sync.
 */
export function useViewMode() {
  const [view, setViewState] = useState<ViewMode>("grid");

  useEffect(() => {
    setViewState(readMode());
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ view: ViewMode }>;
      if (ce.detail?.view === "grid" || ce.detail?.view === "list") {
        setViewState(ce.detail.view);
      }
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () =>
      window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, []);

  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { view: v } }));
  }, []);

  return [view, setView] as const;
}
