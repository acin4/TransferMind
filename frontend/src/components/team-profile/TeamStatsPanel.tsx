import { useMemo, useState } from "react";
import {
  TEAM_STATS_CATEGORIES,
  formatTeamStatValue,
  getTeamStatMeta,
  type TeamStats,
  type TeamStatsCategoryId,
  type TeamStatKey,
} from "../../teamStatsConfig";
import type { TeamSeasonStatEntry } from "../../utils/teamsComparison";
import {
  computeCategoryScore,
  computeStatPerformance,
  getStatColor,
  type TeamStatPerformance,
  type TeamStatPerformanceColor,
} from "../../utils/teamStatsPerformance";
import SegmentedTabs from "../ui/SegmentedTabs";

type TeamStatsPanelProps = {
  stats: TeamStats | null;
  seasonLoading: boolean;
  activeStatsCategory: TeamStatsCategoryId;
  onStatsCategoryChange: (category: TeamStatsCategoryId) => void;
  statsPool: TeamSeasonStatEntry[];
  statsPoolLoading?: boolean;
};

export default function TeamStatsPanel({
  stats,
  seasonLoading,
  activeStatsCategory,
  onStatsCategoryChange,
  statsPool,
  statsPoolLoading = false,
}: TeamStatsPanelProps) {
  const selectedStatsCategory =
    TEAM_STATS_CATEGORIES.find(
      (category) => category.id === activeStatsCategory,
    ) ?? TEAM_STATS_CATEGORIES[0];
  const statPerformances = useMemo(() => {
    if (!stats) {
      return new Map<TeamStatKey, TeamStatPerformance>();
    }

    return new Map(
      selectedStatsCategory.statKeys.map((statKey) => [
        statKey,
        computeStatPerformance(stats, statsPool, statKey),
      ]),
    );
  }, [selectedStatsCategory.statKeys, stats, statsPool]);
  const categoryScore = computeCategoryScore(
    selectedStatsCategory.statKeys.map(
      (statKey) => statPerformances.get(statKey)?.score,
    ),
  );

  return (
    <div
      className="animate-in fade-in duration-300"
      data-category-score={categoryScore ?? ""}
    >
      <div className="mb-6">
        <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">
          Season Statistics
        </h3>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Relative to teams from the same season and tournament
        </p>
      </div>
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
          {statsPoolLoading ? (
            <p className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/50 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500">
              Loading season/tournament comparison pool...
            </p>
          ) : null}
          <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
            {selectedStatsCategory.statKeys.map((statKey) => {
              const statMeta = getTeamStatMeta(statKey);
              const performance = statPerformances.get(statKey);
              return (
                <StatLine
                  key={statKey}
                  label={statMeta.label}
                  value={
                    performance?.rawValue == null
                      ? null
                      : formatTeamStatValue(stats[statKey], statMeta.format)
                  }
                  performance={performance}
                  bestValue={
                    performance?.bestValue == null
                      ? null
                      : formatTeamStatValue(
                          performance.bestValue,
                          statMeta.format,
                        )
                  }
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
  performance,
  bestValue,
  isCard,
}: {
  label: string;
  value: string | number | null;
  performance?: TeamStatPerformance;
  bestValue: string | number | null;
  isCard?: "yellow" | "red";
}) {
  const score = performance?.score ?? null;

  return (
    <div className="grid gap-4 py-5 px-5 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)] sm:items-center sm:px-8 border-b border-slate-800/80 last:border-0 hover:bg-white/[0.02] transition-colors group">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {isCard === "yellow" && (
            <div className="h-4 w-3 rounded-sm bg-yellow-500 shadow-sm" />
          )}
          {isCard === "red" && (
            <div className="h-4 w-3 rounded-sm bg-red-500 shadow-sm" />
          )}
          <span className="min-w-0 text-sm font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-slate-300">
            {label}
          </span>
        </div>
        {value != null ? (
          <div className="mt-2 text-lg font-black text-white">{value}</div>
        ) : null}
      </div>
      <StatPerformanceBar
        score={score}
        bestScore={performance?.bestScore ?? null}
        color={getStatColor(score)}
        bestValue={bestValue}
      />
    </div>
  );
}

function StatPerformanceBar({
  score,
  bestScore,
  color,
  bestValue,
}: {
  score: number | null;
  bestScore: number | null;
  color: TeamStatPerformanceColor;
  bestValue: string | number | null;
}) {
  const hasScore = score != null;
  const scorePercent = hasScore ? Math.round(score * 1000) / 10 : 6;
  const bestPercent =
    bestScore == null ? null : Math.round(bestScore * 1000) / 10;
  const [isExpanded, setIsExpanded] = useState(false);
  const canShowBest = hasScore && bestPercent != null && bestValue != null;

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="group/bar relative h-8 w-full overflow-hidden rounded-full bg-slate-950 text-left ring-1 ring-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
        onBlur={() => setIsExpanded(false)}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        onFocus={() => setIsExpanded(true)}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${getBarFillClass(
            hasScore ? color : "red",
          )}`}
          style={{ width: `${scorePercent}%` }}
        />
        {canShowBest ? (
          <>
            <div
              className={`absolute inset-y-0 left-0 rounded-full border border-white/20 bg-white/10 shadow-[inset_0_0_18px_rgba(255,255,255,0.08)] transition-all duration-200 ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
              style={{ width: `${bestPercent}%` }}
            >
              <span
                className={`absolute inset-y-0 right-3 flex max-w-[calc(100%-0.75rem)] items-center truncate text-[10px] font-black uppercase tracking-widest text-white transition-opacity duration-200 ${
                  isExpanded ? "opacity-100" : "opacity-0"
                }`}
              >
                Best: {bestValue}
              </span>
            </div>
            <div
              className={`absolute inset-y-1 w-0 border-l-2 border-dashed border-white/70 shadow-[0_0_10px_rgba(255,255,255,0.35)] transition-opacity duration-200 ${
                isExpanded ? "opacity-0" : "opacity-80"
              }`}
              style={{
                left: `${bestPercent}%`,
                transform: "translateX(-1px)",
              }}
            />
          </>
        ) : null}
      </button>
    </div>
  );
}

function getBarFillClass(color: TeamStatPerformanceColor) {
  if (color === "red") {
    return "bg-red-500";
  }

  if (color === "yellow") {
    return "bg-yellow-400";
  }

  if (color === "green") {
    return "bg-emerald-500";
  }

  return "bg-slate-700";
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
