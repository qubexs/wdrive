import React, { useEffect, useState, useRef } from "react";

type Props = {
  file: {
    fileLink: string;
    fileName: string;
    fileExtension: string;
    fileSize?: number;
  };
  onClose: () => void;
};

export default function PreviewModal({ file, onClose }: Props) {
  const ext = (file.fileExtension || "").toLowerCase();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetHtml, setSheetHtml] = useState<string | null>(null);
  const [sheetTruncated, setSheetTruncated] = useState(false);
  const [activeSheet, setActiveSheet] = useState(0);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const workbookRef = useRef<any>(null);
  const xlsxRef = useRef<any>(null);

  // text preview
  useEffect(() => {
    if (["txt", "md", "csv", "json"].includes(ext)) {
      // guard large files >5MB - fetch would be heavy
      if ((file.fileSize ?? 0) > 5 * 1024 * 1024) {
        setTextError("File too large to preview. Please download.");
        return;
      }
      fetch(file.fileLink)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed ${r.status}`);
          return r.text();
        })
        .then((t) => setTextContent(t.slice(0, 200000))) // cap 200k chars
        .catch((e) => setTextError(String(e.message || e)));
    }
  }, [file.fileLink, ext, file.fileSize]);

  // docx preview lazy
  useEffect(() => {
    if (ext !== "docx" && ext !== "doc") return;
    if (!containerRef.current) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(file.fileLink);
        if (!res.ok) throw new Error(`Fetch ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        // dynamic import to keep bundle small
        const mod: any = await import("docx-preview");
        // docx-preview expects container + options
        // support both named export and default
        const render = mod.renderAsync || mod.default?.renderAsync || mod.default;
        if (typeof render !== "function") throw new Error("docx-preview not available");
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          await render(buf, containerRef.current, undefined, {
            className: "docx",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
          });
        }
      } catch (e: any) {
        if (!cancelled) setDocxError(String(e.message || e));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [file.fileLink, ext]);

  const isPdf = ext === "pdf";
  const isTxt = ["txt", "md", "csv", "json"].includes(ext);
  const isDocx = ext === "docx" || ext === "doc";
  const isSheet = ext === "xls" || ext === "xlsx";
  const isSlide = ["ppt", "pptx", "pps", "ppsx", "odp"].includes(ext);
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "ico", "svg", "jfif", "bmp"].includes(ext);
  const VIDEO_MIME: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    ogv: "video/ogg",
    mov: "video/quicktime",
  };
  const AUDIO_MIME: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    flac: "audio/flac",
  };
  const isVideo = ext in VIDEO_MIME;
  const isAudio = ext in AUDIO_MIME;

  // spreadsheet preview (SheetJS, lazy)
  const renderSheet = (wb: any, idx: number) => {
    try {
      const XLSX = xlsxRef.current;
      if (!XLSX) throw new Error("Spreadsheet library not loaded");
      const ws = wb.Sheets[wb.SheetNames[idx]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
      const esc = (s: any) =>
        String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
      const MAX_ROWS = 1000;
      const shown = rows.slice(0, MAX_ROWS);
      setSheetTruncated(rows.length > MAX_ROWS);
      const html =
        `<table class="border-collapse text-xs">` +
        shown.map((r) => `<tr>${r.map((c) => `<td class="border px-2 py-1">${esc(c)}</td>`).join("")}</tr>`).join("") +
        `</table>`;
      setSheetHtml(html);
      setActiveSheet(idx);
    } catch (e: any) {
      setSheetError(String(e.message || e));
    }
  };

  useEffect(() => {
    if (!isSheet) return;
    if ((file.fileSize ?? 0) > 15 * 1024 * 1024) {
      setSheetError("Spreadsheet too large to preview. Please download.");
      return;
    }
    let cancelled = false;
    fetch(file.fileLink)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch ${r.status}`);
        return r.arrayBuffer();
      })
      .then(async (buf) => {
        // dynamic import to keep the main bundle small
        const XLSX: any = await import("xlsx");
        if (cancelled) return;
        const wb = XLSX.read(buf, { type: "array" });
        xlsxRef.current = XLSX;
        workbookRef.current = wb;
        setSheetNames(wb.SheetNames ?? []);
        renderSheet(wb, 0);
      })
      .catch((e) => {
        if (!cancelled) setSheetError(String(e.message || e));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.fileLink, isSheet, file.fileSize]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="truncate pr-4 text-sm font-medium text-textC">
            {ext && !file.fileName.toLowerCase().endsWith(`.${ext}`)
              ? `${file.fileName}.${ext}`
              : file.fileName}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={file.fileLink}
              download={file.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#1a73e8] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1765cc]"
              onClick={(e) => e.stopPropagation()}
            >
              Download
            </a>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-textC hover:bg-darkC"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-auto bg-[#f8f9fa] p-4">
          {isPdf && (
            <iframe
              src={file.fileLink}
              className="h-[75vh] w-full rounded border bg-white"
              title={file.fileName}
            />
          )}
          {isImage && (
            <div className="flex justify-center">
              {/* use plain img to avoid next/image domain restrictions for api/serve */}
              <img
                src={file.fileLink}
                alt={file.fileName}
                className="max-h-[75vh] max-w-full object-contain rounded"
              />
            </div>
          )}
          {isVideo && (
            <video controls className="mx-auto max-h-[75vh] w-full max-w-3xl">
              <source src={file.fileLink} type={VIDEO_MIME[ext] ?? "video/mp4"} />
            </video>
          )}
          {isAudio && (
            <div className="flex flex-col items-center gap-4 py-10">
              <audio controls className="w-full max-w-md">
                <source src={file.fileLink} type={AUDIO_MIME[ext] ?? "audio/mpeg"} />
              </audio>
            </div>
          )}
          {isSheet && (
            <div className="rounded border bg-white p-4">
              {sheetError && (
                <div>
                  <p className="mb-2 text-sm text-red-600">{sheetError}</p>
                  <p className="text-sm text-textC">Preview failed. Try download.</p>
                </div>
              )}
              {!sheetError && sheetHtml === null && (
                <p className="text-sm text-textC">Loading spreadsheet...</p>
              )}
              {!sheetError && sheetHtml !== null && (
                <>
                  {sheetNames.length > 1 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {sheetNames.map((n, i) => (
                        <button
                          key={n + i}
                          onClick={() => workbookRef.current && renderSheet(workbookRef.current, i)}
                          className={`rounded-full px-3 py-1 text-xs ${i === activeSheet ? "bg-[#1a73e8] text-white" : "bg-darkC2 text-textC hover:bg-darkC"}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="max-h-[65vh] overflow-auto" dangerouslySetInnerHTML={{ __html: sheetHtml }} />
                  {sheetTruncated && (
                    <p className="mt-2 text-xs text-gray-500">Showing first 1000 rows. Download for the full sheet.</p>
                  )}
                </>
              )}
            </div>
          )}
          {isSlide && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-base font-medium text-textC">PowerPoint preview isn&apos;t supported yet</p>
              <p className="max-w-md text-sm text-gray-500">.{ext} slides can&apos;t be rendered in the browser. Please download the file to view it.</p>
              <a
                href={file.fileLink}
                download={file.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white hover:bg-[#1765cc]"
              >
                Download {file.fileName}
              </a>
            </div>
          )}
          {isTxt && (
            <div className="rounded border bg-white p-4">
              {textError && <p className="text-sm text-red-600">{textError}</p>}
              {textContent === null && !textError && <p className="text-sm text-textC">Loading...</p>}
              {textContent !== null && (
                <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words text-sm text-textC">
                  {textContent}
                </pre>
              )}
            </div>
          )}
          {isDocx && (
            <div className="rounded border bg-white p-4">
              {docxError && (
                <div>
                  <p className="mb-2 text-sm text-red-600">{docxError}</p>
                  <p className="text-sm text-textC">Preview failed. Try download.</p>
                </div>
              )}
              {!docxError && <div ref={containerRef} className="docx-preview max-h-[70vh] overflow-auto" />}
              {!docxError && !containerRef.current?.innerHTML && (
                <p className="text-sm text-textC">Loading document...</p>
              )}
            </div>
          )}
          {!isPdf && !isTxt && !isDocx && !isSheet && !isSlide && !isImage && !isVideo && !isAudio && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-sm text-textC">No inline preview for .{ext || "file"}</p>
              <a
                href={file.fileLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-darkC px-4 py-2 text-sm text-textC hover:bg-darkC2"
              >
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
