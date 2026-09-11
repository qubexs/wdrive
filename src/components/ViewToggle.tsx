import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";
import { useViewMode } from "@/hooks/useViewMode";

export default function ViewToggle() {
  const [view, setView] = useViewMode();
  const btn =
    "rounded-full p-2 transition hover:bg-darkC focus:outline-none";
  const active = "bg-[#C2E7FF]";

  return (
    <div
      className="ml-auto flex items-center gap-1 rounded-full border border-textC/30 px-1 py-0.5"
      title="Change view"
    >
      <button
        type="button"
        aria-label="Grid view"
        title="Grid view"
        onClick={() => setView("grid")}
        className={`${btn} ${view === "grid" ? active : ""}`}
      >
        <BsGrid3X3GapFill className="h-4 w-4 text-textC" />
      </button>
      <button
        type="button"
        aria-label="List view"
        title="List view"
        onClick={() => setView("list")}
        className={`${btn} ${view === "list" ? active : ""}`}
      >
        <BsListUl className="h-4 w-4 text-textC" />
      </button>
    </div>
  );
}
