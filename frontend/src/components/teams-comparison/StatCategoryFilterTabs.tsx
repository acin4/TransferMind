import {
  STAT_CATEGORY_FILTERS,
  type StatCategoryFilterId,
} from "../../utils/statCategories";
import SegmentedTabs from "../ui/SegmentedTabs";

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
      className="flex flex-wrap gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40 p-1.5"
      buttonClassName="shrink-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
      activeClassName="bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.25)]"
      inactiveClassName="text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
    />
  );
}
