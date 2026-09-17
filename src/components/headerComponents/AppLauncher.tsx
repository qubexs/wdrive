"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { MdApps } from "react-icons/md";
import { AiOutlineClose, AiOutlinePlus } from "react-icons/ai";
import { DiGoogleDrive } from "react-icons/di";
import { MdStarBorder, MdAdminPanelSettings, MdHelpOutline } from "react-icons/md";
import { useSession } from "next-auth/react";

type CustomApp = {
  id: string;
  name: string;
  url: string;
};

const STORAGE_KEY = "wdrive.appLauncher.custom";

function loadCustom(): CustomApp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomApp[];
    return Array.isArray(parsed) ? parsed.filter((a) => a?.name && a?.url) : [];
  } catch {
    return [];
  }
}

export default function AppLauncher({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState<CustomApp[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const role = (session?.user as { role?: string; email?: string } | undefined)?.role;
  const isAdmin = role === "ADMIN" || session?.user?.email === "demo@local.dev";

  useEffect(() => {
    setCustom(loadCustom());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  const persist = (next: CustomApp[]) => {
    setCustom(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  };

  const normalizeUrl = (value: string) => {
    const v = value.trim();
    if (!v) return "";
    if (/^(https?:\/\/|\/)/i.test(v)) return v;
    return `https://${v}`;
  };

  const addApp = () => {
    const cleanName = name.trim().slice(0, 40);
    const cleanUrl = normalizeUrl(url);
    if (!cleanName || !cleanUrl) {
      setError("Name and URL are required.");
      return;
    }
    if (cleanUrl.length > 500) {
      setError("URL is too long.");
      return;
    }
    persist([
      ...custom,
      { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`, name: cleanName, url: cleanUrl },
    ]);
    setName("");
    setUrl("");
    setError(null);
    setAdding(false);
  };

  const removeApp = (id: string) => persist(custom.filter((a) => a.id !== id));

  const tileCls =
    "group relative flex h-[84px] flex-col items-center justify-center gap-1 rounded-xl p-2 text-[12px] text-textC hover:bg-darkC";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        aria-label="Apps"
        aria-expanded={open}
        title="Apps"
        className={`flex h-10 w-10 items-center justify-center rounded-full hover:bg-darkC ${
          open ? "bg-darkC" : ""
        }`}
      >
        <MdApps className="h-6 w-6 text-textC" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-20 w-[320px] rounded-2xl bg-white p-4 shadow-lg shadow-[#bbb]">
          <div className="grid grid-cols-3 gap-1">
            {/* Default = Wdrive */}
            <Link href="/drive/my-drive" onClick={onClose} className={tileCls}>
              <Image
                src={`${router.basePath}/wpre.png`}
                width={32}
                height={32}
                alt="Wdrive"
                className="h-8 w-8 object-contain"
                draggable={false}
              />
              <span>Wdrive</span>
            </Link>
            <Link href="/drive" onClick={onClose} className={tileCls}>
              <DiGoogleDrive className="h-8 w-8" />
              <span>Shared</span>
            </Link>
            <Link href="/drive/starred" onClick={onClose} className={tileCls}>
              <MdStarBorder className="h-8 w-8" />
              <span>Starred</span>
            </Link>
            <Link href="/help" onClick={onClose} className={tileCls}>
              <MdHelpOutline className="h-8 w-8" />
              <span>Help</span>
            </Link>
            {isAdmin && (
              <>
                <Link href="/admin" onClick={onClose} className={tileCls}>
                  <MdAdminPanelSettings className="h-8 w-8" />
                  <span>Admin</span>
                </Link>
                <a
                  href="http://10.44.145.220/edr"
                  target="_blank"
                  rel="noreferrer"
                  className={tileCls}
                  title="EDR console (admin, via wdrive session)"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a73e8] text-sm font-bold text-white">
                    E
                  </span>
                  <span>EDR</span>
                </a>
              </>
            )}
            {/* Custom links */}
            {custom.map((app) => {
              const external = /^https?:\/\//i.test(app.url);
              const letter = (app.name.trim()[0] ?? "?").toUpperCase();
              const inner = (
                <>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-darkC2 text-sm font-bold text-textC2">
                    {letter}
                  </span>
                  <span className="max-w-full truncate">{app.name}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeApp(app.id);
                    }}
                    aria-label={`Remove ${app.name}`}
                    title="Remove"
                    className="absolute right-1 top-1 hidden rounded-full p-0.5 hover:bg-darkC2 group-hover:block"
                  >
                    <AiOutlineClose className="h-3 w-3" />
                  </button>
                </>
              );
              return external ? (
                <a key={app.id} href={app.url} target="_blank" rel="noreferrer" className={tileCls} title={app.url}>
                  {inner}
                </a>
              ) : (
                <Link key={app.id} href={app.url} onClick={onClose} className={tileCls} title={app.url}>
                  {inner}
                </Link>
              );
            })}
            {/* Add tile */}
            <button
              onClick={() => {
                setAdding((v) => !v);
                setError(null);
              }}
              className={tileCls}
              title="Add app / link"
            >
              <AiOutlinePlus className="h-8 w-8" />
              <span>Add</span>
            </button>
          </div>

          {adding && (
            <div className="mt-3 space-y-2 border-t border-darkC pt-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (e.g. Wiki)"
                maxLength={40}
                className="w-full rounded-lg border border-textC/30 px-3 py-1.5 text-sm outline-none focus:border-[#1a73e8]"
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL (/wiki or https://…)"
                maxLength={500}
                className="w-full rounded-lg border border-textC/30 px-3 py-1.5 text-sm outline-none focus:border-[#1a73e8]"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setAdding(false)} className="rounded-full px-4 py-1 text-sm hover:bg-darkC">
                  Cancel
                </button>
                <button
                  onClick={addApp}
                  className="rounded-full bg-[#1a73e8] px-4 py-1 text-sm text-white hover:bg-[#1765cc]"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
