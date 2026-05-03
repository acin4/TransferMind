import type { StandingsGroup } from "../../api/api";
import SegmentedTabs from "../ui/SegmentedTabs";

type StageTabsProps = {
  groups: StandingsGroup[];
  selectedGroupKey: string | null;
  onSelectGroup: (groupKey: string) => void;
};

export default function StageTabs({
  groups,
  selectedGroupKey,
  onSelectGroup,
}: StageTabsProps) {
  if (groups.length <= 1) {
    return null;
  }

  return (
    <div className="px-6 pt-6 md:px-8 md:pt-8">
      <SegmentedTabs
        items={groups.map((stage) => ({
          value: stage.key,
          label: (
            <span
              title={stage.label}
              className="block max-w-[14rem] truncate"
            >
              {stage.label}
            </span>
          ),
        }))}
        value={selectedGroupKey}
        onChange={onSelectGroup}
        className="flex w-full gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-1.5 md:w-max"
        buttonClassName="px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
      />
    </div>
  );
}
