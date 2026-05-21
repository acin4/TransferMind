import {
  STAT_CATEGORY_FILTERS,
  type StatCategoryFilterId,
} from "../../utils/statCategories";
import SegmentedTabs from "../ui/SegmentedTabs";
import { standingsTheme } from "../ui/design";

type StatCategoryFilterTabsProps = {
  value: StatCategoryFilterId;
  onChange: (value: StatCategoryFilterId) => void;
};

export default function StatCategoryFilterTabs({
  value,
  onChange,
}: StatCategoryFilterTabsProps) {
  return (
    <SegmentedTabs
      items={STAT_CATEGORY_FILTERS.map((category) => ({
        value: category.id,
        label: category.label,
      }))}
      value={value}
      onChange={onChange}
      className={standingsTheme.compactSegmentedTabs}
      buttonClassName={standingsTheme.compactSegmentedTabButton}
      activeClassName="bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.25)]"
      inactiveClassName="text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
    />
  );
}
