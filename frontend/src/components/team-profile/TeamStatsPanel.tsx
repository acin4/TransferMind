import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { createPortal } from "react-dom";
import { ArrowUp } from "lucide-react";
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
  adjustStatScore,
  getStatColor,
  getStatMinMax,
  normalizeStat,
  toNumericStatValue,
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
  seasonError?: string | null;
  selectedTeamId?: number | string | null;
  selectedSeasonName?: string | null;
  selectedTournamentName?: string | null;
};

export default function TeamStatsPanel({
  stats,
  seasonLoading,
  activeStatsCategory,
  onStatsCategoryChange,
  statsPool,
  statsPoolLoading = false,
  seasonError = null,
  selectedTeamId = null,
  selectedSeasonName = null,
  selectedTournamentName = null,
}: TeamStatsPanelProps) {
  const [selectedStat, setSelectedStat] = useState<TeamStatKey | null>(null);
  const [showBackToStatsButton, setShowBackToStatsButton] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const statsTopRef = useRef<HTMLDivElement | null>(null);
  const rankingChartRef = useRef<HTMLDivElement | null>(null);
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
  const selectedStatMeta = selectedStat ? getTeamStatMeta(selectedStat) : null;
  const rankingRows = useMemo(() => {
    if (!selectedStat) {
      return [];
    }

    const { minValue, maxValue } = getStatMinMax(statsPool, selectedStat);

    return statsPool
      .map((entry) => {
        const rawValue = toNumericStatValue(entry.stats[selectedStat]);
        const normalized = normalizeStat(rawValue, minValue, maxValue);
        const rankScore = adjustStatScore(normalized, selectedStat);

        return {
          id: entry.id,
          teamId: entry.teamId,
          teamName: entry.teamName || `Team ${entry.teamId}`,
          teamLogo: entry.teamLogo ?? null,
          rawValue,
          rankScore,
          formattedValue:
            rawValue == null
              ? null
              : formatTeamStatValue(rawValue, selectedStatMeta?.format),
          isSelectedTeam:
            selectedTeamId != null &&
            String(entry.teamId) === String(selectedTeamId),
        };
      })
      .sort((a, b) => {
        const aScore = a.rankScore ?? -1;
        const bScore = b.rankScore ?? -1;

        if (aScore !== bScore) {
          return aScore - bScore;
        }

        return a.teamName.localeCompare(b.teamName);
      });
  }, [selectedStat, selectedStatMeta?.format, selectedTeamId, statsPool]);
  const rankingScale = useMemo(() => getRankingScale(rankingRows), [rankingRows]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!selectedStat) {
      setShowBackToStatsButton(false);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      rankingChartRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedStat]);

  useEffect(() => {
    const chartElement = rankingChartRef.current;

    if (!selectedStat || !chartElement || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowBackToStatsButton(Boolean(entry?.isIntersecting));
      },
      {
        root: null,
        threshold: 0.15,
      },
    );

    observer.observe(chartElement);

    return () => observer.disconnect();
  }, [selectedStat]);

  const handleSelectStat = (statKey: TeamStatKey) => {
    setSelectedStat(statKey);
  };

  const scrollToStatsTop = () => {
    if (!selectedStat) {
      return;
    }

    document.getElementById(`stat-${selectedStat}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div
      className="animate-in fade-in duration-300"
      data-category-score={categoryScore ?? ""}
      ref={statsTopRef}
    >
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 p-6 md:p-10 shadow-2xl backdrop-blur-sm">
        {seasonError ? (
          <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-xs font-black uppercase tracking-widest text-rose-400">
            {seasonError}
          </div>
        ) : null}

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
            className="mb-6 grid grid-cols-5 gap-1 rounded-2xl border border-slate-800 bg-slate-900/50 p-1.5"
            buttonClassName="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-xl px-1.5 py-2.5 text-[8px] font-black uppercase tracking-wide transition-all sm:px-2 sm:text-[9px] md:text-[10px]"
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
                  statKey={statKey}
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
                  isSelected={selectedStat === statKey}
                  onSelect={handleSelectStat}
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

      {stats && selectedStat && selectedStatMeta ? (
        <StatRankingChart
          refNode={rankingChartRef}
          statLabel={selectedStatMeta.label}
          tournamentName={selectedTournamentName}
          seasonName={selectedSeasonName}
          rows={rankingRows}
          scale={rankingScale}
          statsPoolLoading={statsPoolLoading}
        />
      ) : null}
      {selectedStat && showBackToStatsButton && portalTarget
        ? createPortal(
            <button
              type="button"
              onClick={scrollToStatsTop}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/90 text-slate-300 shadow-2xl backdrop-blur transition-colors hover:border-blue-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{
                position: "fixed",
                left: 8,
                bottom: 24,
                zIndex: 9999,
              }}
              aria-label="Back to selected stat"
              title="Back to selected stat"
            >
              <ArrowUp size={18} />
            </button>,
            portalTarget,
          )
        : null}
    </div>
  );
}

function StatLine({
  statKey,
  label,
  value,
  performance,
  bestValue,
  isCard,
  isSelected,
  onSelect,
}: {
  statKey: TeamStatKey;
  label: string;
  value: string | number | null;
  performance?: TeamStatPerformance;
  bestValue: string | number | null;
  isCard?: "yellow" | "red";
  isSelected: boolean;
  onSelect: (statKey: TeamStatKey) => void;
}) {
  const score = performance?.score ?? null;

  return (
    <div
      id={`stat-${statKey}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(statKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(statKey);
        }
      }}
      className={`grid cursor-pointer gap-4 border-b border-slate-800/80 px-5 py-5 transition-colors last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)] sm:items-center sm:px-8 group focus:outline-none focus-visible:bg-blue-500/10 ${
        isSelected
          ? "bg-blue-500/[0.08] ring-1 ring-inset ring-blue-500/30"
          : "hover:bg-white/[0.02]"
      }`}
    >
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

function StatRankingChart({
  refNode,
  statLabel,
  tournamentName,
  seasonName,
  rows,
  scale,
  statsPoolLoading,
}: {
  refNode: MutableRefObject<HTMLDivElement | null>;
  statLabel: string;
  tournamentName?: string | null;
  seasonName?: string | null;
  rows: Array<{
    id: string;
    teamId: number;
    teamName: string;
    teamLogo: string | null;
    rawValue: number | null;
    rankScore: number | null;
    formattedValue: string | null;
    isSelectedTeam: boolean;
  }>;
  scale: RankingScale;
  statsPoolLoading: boolean;
}) {
  const contextLabel = [tournamentName, seasonName].filter(Boolean).join(" ");

  return (
    <section
      ref={refNode}
      className="relative left-1/2 mt-10 w-[calc(100vw-3rem)] max-w-7xl -translate-x-1/2 rounded-[2rem] border border-slate-700/70 bg-slate-900/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.5),0_0_32px_rgba(59,130,246,0.08)] sm:w-[calc(100vw-4rem)] sm:p-6 md:w-[calc(100vw-6rem)] md:p-8"
    >
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <h4 className="text-xl font-black uppercase tracking-tight text-white md:text-2xl">
          {statLabel} ranking — {contextLabel || "Selected context"}
        </h4>
        <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-slate-400">
          Compared with all teams from the same season and tournament
        </p>
      </div>

      {statsPoolLoading ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-6 text-center text-xs font-black uppercase tracking-widest text-slate-500 shadow-inner">
          Loading ranking data...
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-6 text-center text-xs font-black uppercase tracking-widest text-slate-500 shadow-inner">
          No ranking data available.
        </p>
      ) : (
        <div className="rounded-[1.5rem] border border-slate-800/90 bg-slate-950/70 px-3 pb-5 pt-6 shadow-inner sm:px-4 md:px-6 md:pb-7 md:pt-7">
          <div
            className="grid items-end gap-1.5 sm:gap-2.5 md:gap-4"
            style={{
              gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`,
            }}
          >
            {rows.map((row) => (
              <RankingColumn key={row.id} row={row} scale={scale} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

type RankingScale = {
  min: number;
  max: number;
  range: number;
  baselinePercent: number;
};

function RankingColumn({
  row,
  scale,
}: {
  row: {
    teamId: number;
    teamName: string;
    teamLogo: string | null;
    rawValue: number | null;
    rankScore: number | null;
    formattedValue: string | null;
    isSelectedTeam: boolean;
  };
  scale: RankingScale;
}) {
  const hasValue = row.rawValue != null;
  const rawValue = row.rawValue ?? 0;
  const valuePercent = ((rawValue - scale.min) / scale.range) * 100;
  const barStart = Math.min(valuePercent, scale.baselinePercent);
  const barHeight = Math.max(3, Math.abs(valuePercent - scale.baselinePercent));
  const labelBottom = Math.min(96, Math.max(4, barStart + barHeight));
  const initials = getTeamInitials(row.teamName);

  return (
    <div
      className={`group flex min-w-0 flex-col items-center rounded-2xl border px-1.5 py-3 transition-colors sm:px-2 md:px-3 md:py-4 ${
        row.isSelectedTeam
          ? "border-blue-500/60 bg-blue-500/10 shadow-[0_0_24px_rgba(59,130,246,0.16)]"
          : "border-transparent bg-transparent hover:border-slate-800/80 hover:bg-slate-950/30"
      }`}
    >
      <TeamLogo logoUrl={row.teamLogo} teamName={row.teamName} compact />
      <div className="mt-2 h-10 w-full min-w-0">
        <p
          className="line-clamp-2 break-words text-center text-[8px] font-black uppercase leading-tight text-slate-300 sm:text-[9px] md:text-[10px]"
          title={row.teamName}
        >
          {row.teamName.length > 18 ? initials : row.teamName}
        </p>
      </div>

      <div className="mt-3 h-[300px] w-full md:h-[380px]">
        <div className="relative mx-auto h-full w-full max-w-16">
          <div
            className="absolute left-0 right-0 z-0 h-px bg-slate-600/70"
            style={{ bottom: `${scale.baselinePercent}%` }}
          />
          {hasValue ? (
            <>
              <div
                className="absolute left-1/2 z-10 w-max min-w-[2rem] -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-950/90 px-1 py-0.5 text-center text-[8px] font-black tabular-nums text-white ring-1 ring-slate-700 sm:min-w-[2.35rem] sm:px-1.5 sm:text-[10px] md:min-w-[2.75rem] md:text-xs"
                style={{
                  bottom: `calc(${labelBottom}% + 0.45rem)`,
                }}
              >
                {row.formattedValue}
              </div>
              <div
                className={`absolute left-1/2 z-0 w-3.5 -translate-x-1/2 rounded-t-full rounded-b-full shadow-[0_10px_28px_rgba(15,23,42,0.3)] sm:w-5 md:w-7 ${
                  row.isSelectedTeam
                    ? "bg-blue-400 ring-2 ring-blue-200/50"
                    : "bg-gradient-to-t from-slate-500 to-slate-200 group-hover:from-blue-500 group-hover:to-blue-200"
                }`}
                style={{
                  bottom: `${barStart}%`,
                  height: `${barHeight}%`,
                }}
              />
            </>
          ) : (
            <div className="absolute bottom-0 left-1/2 h-3 w-5 -translate-x-1/2 rounded-full bg-red-500 sm:w-7" />
          )}
        </div>
      </div>
    </div>
  );
}

function TeamLogo({
  logoUrl,
  teamName,
  compact = false,
}: {
  logoUrl: string | null;
  teamName: string;
  compact?: boolean;
}) {
  const sizeClass = compact
    ? "aspect-square w-full max-w-[1.75rem] sm:max-w-[2rem] md:max-w-[2.5rem]"
    : "h-10 w-10";

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={`${sizeClass} rounded-xl bg-white/5 object-contain p-1`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-slate-800 text-[9px] font-black text-slate-300 sm:text-[10px] md:text-xs`}
    >
      {getTeamInitials(teamName)}
    </div>
  );
}

function getRankingScale(
  rows: Array<{ rawValue: number | null }>,
): RankingScale {
  const values = rows
    .map((row) => row.rawValue)
    .filter((value): value is number => value != null);

  if (values.length === 0) {
    return {
      min: 0,
      max: 1,
      range: 1,
      baselinePercent: 0,
    };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const min = minValue < 0 ? minValue : 0;
  const max = maxValue > 0 ? maxValue : 0;
  const range = max === min ? 1 : max - min;

  return {
    min,
    max,
    range,
    baselinePercent: ((0 - min) / range) * 100,
  };
}

function getTeamInitials(teamName: string) {
  return teamName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
