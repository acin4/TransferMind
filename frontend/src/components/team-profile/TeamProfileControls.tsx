import SegmentedTabs from "../ui/SegmentedTabs";
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
    <SegmentedTabs
      items={[
        { value: "standings", label: "Standings" },
        { value: "statistics", label: "Statistics" },
        { value: "squad", label: "Squad" },
      ]}
      value={activeTab}
      onChange={onTabChange}
      className="flex gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max"
      buttonClassName="px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
    />
  );
}
