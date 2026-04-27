import type { StandingsGroup } from "../../api/api";

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
      <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max overflow-x-auto">
        {groups.map((stage) => (
          <StageTabButton
            key={stage.key}
            label={stage.label}
            isActive={selectedGroupKey === stage.key}
            onClick={() => onSelectGroup(stage.key)}
          />
        ))}
      </div>
    </div>
  );
}

function StageTabButton({
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
      className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
        isActive
          ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border-b-2 border-blue-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-b-2 border-transparent"
      }`}
    >
      {label}
    </button>
  );
}
