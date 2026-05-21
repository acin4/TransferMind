import type { StandingsGroup } from "../../api/api";
import SegmentedTabs from "../ui/SegmentedTabs";
import { standingsTheme } from "../ui/design";

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
        className={standingsTheme.segmentedTabs}
        buttonClassName={standingsTheme.segmentedTabButton}
      />
    </div>
  );
}
