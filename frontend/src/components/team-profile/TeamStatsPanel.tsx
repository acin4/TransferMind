import {
  TEAM_STATS_CATEGORIES,
  formatTeamStatValue,
  getTeamStatMeta,
  type TeamStats,
  type TeamStatsCategoryId,
  type TeamStatKey,
} from "../../teamStatsConfig";
import SegmentedTabs from "../ui/SegmentedTabs";

type TeamStatsPanelProps = {
  stats: TeamStats | null;
  seasonLoading: boolean;
  activeStatsCategory: TeamStatsCategoryId;
  onStatsCategoryChange: (category: TeamStatsCategoryId) => void;
};

export default function TeamStatsPanel({
  stats,
  seasonLoading,
  activeStatsCategory,
  onStatsCategoryChange,
}: TeamStatsPanelProps) {
  const selectedStatsCategory =
    TEAM_STATS_CATEGORIES.find(
      (category) => category.id === activeStatsCategory,
    ) ?? TEAM_STATS_CATEGORIES[0];

  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">
        Season Statistics
      </h3>
      {seasonLoading ? (
        <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
          Loading season statistics...
        </p>
      ) : stats ? (
        <>
          <SegmentedTabs
            items={TEAM_STATS_CATEGORIES.map((category) => ({
              value: category.id,
              label: `${category.label} (${category.statKeys.length})`,
            }))}
            value={activeStatsCategory}
            onChange={onStatsCategoryChange}
            className="flex gap-2 mb-6 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto"
            buttonClassName="px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
          />
          <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
            {selectedStatsCategory.statKeys.map((statKey) => {
              const statMeta = getTeamStatMeta(statKey);
              return (
                <StatLine
                  key={statKey}
                  label={statMeta.label}
                  value={formatTeamStatValue(stats[statKey], statMeta.format)}
                  isCard={getStatCardColor(statKey)}
                />
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
          Δεν βρέθηκαν στατιστικά για αυτή την ομάδα.
        </p>
      )}
    </div>
  );
}

function StatLine({
  label,
  value,
  isCard,
}: {
  label: string;
  value: string | number;
  isCard?: "yellow" | "red";
}) {
  return (
    <div className="flex justify-between items-center py-5 px-8 border-b border-slate-800/80 last:border-0 hover:bg-white/[0.02] transition-colors group">
      <div className="flex items-center gap-3">
        {isCard === "yellow" && (
          <div className="w-3 h-4 bg-yellow-500 rounded-sm shadow-sm" />
        )}
        {isCard === "red" && (
          <div className="w-3 h-4 bg-red-500 rounded-sm shadow-sm" />
        )}
        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">
          {label}
        </span>
      </div>
      <span className="text-white font-black text-lg">{value}</span>
    </div>
  );
}

function getStatCardColor(statKey: TeamStatKey) {
  if (statKey === "yellowcards" || statKey === "yellowcards_against") {
    return "yellow";
  }

  if (statKey === "redcards" || statKey === "redcards_against") {
    return "red";
  }

  return undefined;
}
