import { useEffect, useMemo, useRef, useState } from "react";

export type DepartmentOption = { id: string; name: string };

type Props = {
  value: DepartmentOption | null;
  onChange: (v: DepartmentOption | null) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  dark?: boolean;
  compact?: boolean;
  allowClear?: boolean;
  options?: DepartmentOption[];
};

let cachedOptions: DepartmentOption[] | null = null;

export function useDepartments(external?: DepartmentOption[]) {
  const [options, setOptions] = useState<DepartmentOption[]>(external ?? cachedOptions ?? []);
  const [loading, setLoading] = useState(!(external ?? cachedOptions));
  useEffect(() => {
    if (external) {
      setOptions(external);
      setLoading(false);
      return;
    }
    if (cachedOptions) {
      setOptions(cachedOptions);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/wdrive/api/departments");
        if (!res.ok) return;
        const j = (await res.json()) as DepartmentOption[];
        if (cancelled) return;
        cachedOptions = j;
        setOptions(j);
      } catch {
        /* offline — show empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [external]);
  return { options, loading };
}

// Autocomplete combobox: type to filter, list shows up, must pick from list.
// Strict mode — free-text that doesn't exactly match is rejected on blur.
export default function DepartmentCombobox({
  value,
  onChange,
  required,
  disabled,
  placeholder = "Type to search department / unit…",
  dark,
  compact,
  allowClear,
  options: externalOptions,
}: Props) {
  const { options, loading } = useDepartments(externalOptions);
  const [text, setText] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [touched, setTouched] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value?.name ?? "");
  }, [value?.id, value?.name]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.name.toLowerCase().includes(q));
  }, [options, text]);

  useEffect(() => setHighlight(0), [text]);

  const exactMatch = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return null;
    return options.find(o => o.name.toLowerCase() === q) ?? null;
  }, [options, text]);

  const invalid = touched && required && !value;

  const commit = (opt: DepartmentOption | null) => {
    onChange(opt);
    setText(opt?.name ?? "");
    setOpen(false);
    setTouched(true);
  };

  const handleBlur = () => {
    // strict: revert unless exact match
    if (!text.trim()) {
      if (!required) commit(null);
      else if (value) setText(value.name);
      setTouched(true);
      return;
    }
    if (exactMatch) {
      if (exactMatch.id !== value?.id) commit(exactMatch);
      else setText(exactMatch.name);
    } else {
      // reject free text
      setText(value?.name ?? "");
    }
    setTouched(true);
  };

  const boxCls = dark
    ? `h-12 w-full rounded-[4px] border bg-transparent px-4 text-[15px] text-white outline-none placeholder:text-[#9aa0a6] ${invalid ? "border-[#f28b82]" : "border-[#8e918f] focus:border-[#8ab4f8]"}`
    : `${compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"} w-full rounded border outline-none ${invalid ? "border-red-400" : "border-gray-300 focus:border-[#1a73e8]"} ${disabled ? "bg-gray-100" : "bg-white"}`;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center gap-1">
        <input
          value={text}
          disabled={disabled}
          placeholder={loading ? "Loading departments…" : placeholder}
          className={boxCls}
          autoComplete="off"
          onFocus={() => !disabled && setOpen(true)}
          onChange={e => {
            setText(e.target.value);
            setOpen(true);
          }}
          onBlur={handleBlur}
          onKeyDown={e => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight(h => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight(h => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const pick = filtered[highlight] ?? exactMatch;
              if (pick) commit(pick);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {allowClear && value && !disabled && (
          <button
            type="button"
            title="Clear"
            className={dark ? "px-1 text-[#9aa0a6]" : "px-1 text-gray-400 hover:text-gray-600"}
            onMouseDown={e => e.preventDefault()}
            onClick={() => commit(null)}
          >
            ✕
          </button>
        )}
      </div>
      {open && !disabled && (
        <ul
          className={`absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border shadow-lg ${
            dark ? "border-[#3c4043] bg-[#2d2e30] text-white" : "border-gray-200 bg-white text-gray-800"
          }`}
        >
          {filtered.length === 0 ? (
            <li className={`px-3 py-2 text-xs ${dark ? "text-[#9aa0a6]" : "text-gray-400"}`}>
              {loading ? "Loading…" : "No match — refine typing or pick from the list"}
            </li>
          ) : (
            filtered.slice(0, 100).map((o, i) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    i === highlight
                      ? dark
                        ? "bg-[#3c4043]"
                        : "bg-[#e8f0fe]"
                      : value?.id === o.id
                        ? dark
                          ? "bg-[#35363a]"
                          : "bg-gray-50"
                        : ""
                  } hover:${dark ? "bg-[#3c4043]" : "bg-gray-100"}`}
                  onMouseDown={e => e.preventDefault()}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => commit(o)}
                >
                  {o.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {invalid && (
        <p className={`mt-1 text-xs ${dark ? "text-[#f28b82]" : "text-red-500"}`}>
          Please select a department from the list
        </p>
      )}
    </div>
  );
}
