import type { TeamProfileTabId } from "./types";

type TeamProfileControlsProps = {
  activeTab: TeamProfileTabId;
  onTabChange: (tab: TeamProfileTabId) => void;
};

export default function TeamProfileControls({
  activeTab,
  onTabChange,
}: TeamProfileControlsProps) {
  return (
    <div className="flex gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max">
      <TabButton
        label="Standings"
        isActive={activeTab === "standings"}
        onClick={() => onTabChange("standings")}
      />
      <TabButton
        label="Statistics"
        isActive={activeTab === "statistics"}
        onClick={() => onTabChange("statistics")}
      />
      <TabButton
        label="Squad"
        isActive={activeTab === "squad"}
        onClick={() => onTabChange("squad")}
      />
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
        isActive
          ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border-b-2 border-blue-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-b-2 border-transparent"
      }`}
    >
      {label}
    </button>
  );
}
