import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Shield } from "lucide-react";
import {
  formatRawStatValue,
  formatRelativeScoreValue,
  getRelativeScoreBand,
  getRelativeScoreBandTextColorClass,
  type TeamSeasonStatEntry,
} from "../../utils/teamsComparison";
import {
  getTeamStatMeta,
  isNegativeTeamStat,
  type TeamStatKey,
} from "../../teamStatsConfig";
import {
  ALL_STAT_CATEGORIES,
  filterTeamStatItemsByCategory,
  type StatCategoryFilterId,
} from "../../utils/statCategories";
import {
  ALL_COUNTRIES_TAB,
  COUNTRY_FILTER_TABS,
  filterItemsByCountry,
  type CountryFilterTab,
} from "../../utils/countryFilters";
import SearchableCheckboxPanel from "./SearchableCheckboxPanel";
import StatCategoryFilterTabs from "./StatCategoryFilterTabs";
import SegmentedTabs from "../ui/SegmentedTabs";

const SERIES_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#eab308",
  "#a855f7",
  "#14b8a6",
  "#ef4444",
  "#f43f5e",
];
type CustomComparisonTabProps = {
  entries: TeamSeasonStatEntry[];
  statKeys: TeamStatKey[];
};

type ComparisonDisplayEntry = {
  id: string;
  label: string;
  teamId: number;
  teamLogo: string | null;
};

type ComparisonValue = {
  rawValue: number | null;
  adjustedScore: number | null;
};

type ComparisonEntry = {
  id: string;
  teamId: number;
  teamName: string;
  values: Partial<Record<TeamStatKey, ComparisonValue>>;
};

type ComparisonStat = {
  key: TeamStatKey;
  label: string;
};

type ComparisonPayload = {
  stats: ComparisonStat[];
  entries: ComparisonEntry[];
};

export default function CustomComparisonTab({
  entries,
  statKeys,
}: CustomComparisonTabProps) {
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<TeamStatKey[]>([]);
  const [selectedCountryFilter, setSelectedCountryFilter] =
    useState<CountryFilterTab>(ALL_COUNTRIES_TAB);
  const [selectedStatCategory, setSelectedStatCategory] =
    useState<StatCategoryFilterId>(ALL_STAT_CATEGORIES);

  const entryOptions = useMemo(
    () =>
      entries.map((entry) => ({
        value: entry.id,
        label: entry.teamName || entry.label,
        helperText: [
          entry.seasonName || `Season ${entry.seasonId}`,
          entry.tournamentName ?? "Unknown league",
        ].join(" • "),
        kind: "team-season" as const,
        logoUrl: entry.teamLogo,
        country: entry.country ?? null,
        seasonLabel: entry.seasonName,
        tagLabel: entry.teamName || entry.label,
        tagHelperText: entry.seasonName,
        searchFields: [
          entry.teamName,
          entry.label,
          entry.seasonName,
          entry.seasonId,
          entry.tournamentName,
          entry.tournamentId,
          entry.stageLabel,
          entry.stageName,
          entry.groupName,
          entry.standingGroupId,
          entry.stageTournamentId,
          entry.country,
        ],
      })),
    [entries],
  );

  const countryFilteredEntryOptions = useMemo(() => {
    return filterItemsByCountry(entryOptions, selectedCountryFilter);
  }, [entryOptions, selectedCountryFilter]);

  const statOptions = useMemo(
    () =>
      statKeys.map((statKey) => ({
        value: statKey,
        label: getTeamStatMeta(statKey).label,
        helperText: statKey,
        kind: "stat" as const,
        statKey,
        searchFields: [getTeamStatMeta(statKey).label, statKey],
      })),
    [statKeys],
  );

  const categoryFilteredStatOptions = useMemo(() => {
    return filterTeamStatItemsByCategory(statOptions, selectedStatCategory);
  }, [selectedStatCategory, statOptions]);

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedEntryIds.includes(entry.id)),
    [entries, selectedEntryIds],
  );

  const selectedStats = useMemo(
    () => statKeys.filter((statKey) => selectedStatKeys.includes(statKey)),
    [selectedStatKeys, statKeys],
  );

  const comparisonPayload = useMemo<ComparisonPayload | null>(() => {
    if (selectedEntries.length === 0 || selectedStats.length === 0) {
      return null;
    }

    const contextPools = buildContextPools(entries);
    const stats = selectedStats.map((statKey) => ({
      key: statKey,
      label: getTeamStatMeta(statKey).label,
    }));

    return {
      stats,
      entries: selectedEntries.map((entry) => {
        const contextPool = contextPools.get(getEntryContextKey(entry)) ?? [];

        return {
          id: entry.id,
          teamId: entry.teamId,
          teamName: entry.teamName,
          values: Object.fromEntries(
            selectedStats.map((statKey) => {
              const rawValue = toNumericStatValue(entry.stats[statKey]);

              return [
                statKey,
                {
                  rawValue,
                  adjustedScore: calculateContextRelativeScore(
                    rawValue,
                    contextPool,
                    statKey,
                  ),
                },
              ];
            }),
          ),
        };
      }),
    };
  }, [entries, selectedEntries, selectedStats]);

  const displayEntries = useMemo<ComparisonDisplayEntry[]>(
    () =>
      (comparisonPayload?.entries ?? []).map((entry) => {
        const sourceEntry = selectedEntries.find(
          (candidate) => candidate.id === entry.id,
        );

        return {
          id: entry.id,
          label: sourceEntry?.label ?? entry.teamName,
          teamId: entry.teamId,
          teamLogo: sourceEntry?.teamLogo ?? null,
        };
      }),
    [comparisonPayload, selectedEntries],
  );

  const chartData = useMemo(
    () =>
      (comparisonPayload?.stats ?? []).map((stat) => {
        const row: Record<string, number | string | null> = {
          statKey: stat.key,
          statLabel: stat.label,
        };

        comparisonPayload?.entries.forEach((entry) => {
          const value = entry.values[stat.key];
          row[entry.id] =
            value?.adjustedScore == null
              ? null
              : Number(value.adjustedScore.toFixed(2));
          row[`${entry.id}__raw`] = value?.rawValue ?? null;
        });

        return row;
      }),
    [comparisonPayload],
  );

  const readyForComparison =
    selectedEntries.length >= 1 && selectedStats.length >= 1;
  const shouldRenderBarChart =
    readyForComparison && Boolean(comparisonPayload) && selectedStats.length <= 2;
  const shouldRenderRadarChart =
    readyForComparison && Boolean(comparisonPayload) && selectedStats.length > 2;

  const toggleEntry = (entryId: string) => {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((value) => value !== entryId)
        : [...current, entryId],
    );
  };

  const toggleStat = (statKey: string) => {
    const typedStatKey = statKey as TeamStatKey;

    setSelectedStatKeys((current) =>
      current.includes(typedStatKey)
        ? current.filter((value) => value !== typedStatKey)
        : [...current, typedStatKey],
    );
  };

  const selectVisibleEntries = (visibleEntryIds: string[]) => {
    setSelectedEntryIds((current) => [
      ...current,
      ...visibleEntryIds.filter((entryId) => !current.includes(entryId)),
    ]);
  };

  const clearVisibleEntries = (visibleEntryIds: string[]) => {
    const visibleEntryIdSet = new Set(visibleEntryIds);
    setSelectedEntryIds((current) =>
      current.filter((entryId) => !visibleEntryIdSet.has(entryId)),
    );
  };

  const selectVisibleStats = (visibleStatKeys: string[]) => {
    const visibleTypedStatKeys = visibleStatKeys as TeamStatKey[];

    setSelectedStatKeys((current) => [
      ...current,
      ...visibleTypedStatKeys.filter((statKey) => !current.includes(statKey)),
    ]);
  };

  const clearVisibleStats = (visibleStatKeys: string[]) => {
    const visibleStatKeySet = new Set(visibleStatKeys);
    setSelectedStatKeys((current) =>
      current.filter((statKey) => !visibleStatKeySet.has(statKey)),
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
      <div className="space-y-6">
        <SearchableCheckboxPanel
          title="Team + Season Entries"
          subtitle="Select one or more entries"
          items={countryFilteredEntryOptions}
          selectedValues={selectedEntryIds}
          onToggle={toggleEntry}
          onSelectVisible={selectVisibleEntries}
          onClearVisible={clearVisibleEntries}
          controls={
            <SegmentedTabs
              items={COUNTRY_FILTER_TABS.map((country) => ({
                value: country,
                label: country,
              }))}
              value={selectedCountryFilter}
              onChange={setSelectedCountryFilter}
              className="flex flex-wrap gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40 p-1.5"
              buttonClassName="shrink-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
              activeClassName="bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.25)]"
              inactiveClassName="text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
            />
          }
          searchPlaceholder="Search team or season..."
          maxHeightClassName="max-h-[360px]"
        />

        <SearchableCheckboxPanel
          title="Statistics"
          subtitle="Pick one or more team stats"
          items={categoryFilteredStatOptions}
          selectionItems={statOptions}
          selectedValues={selectedStatKeys}
          onToggle={toggleStat}
          onSelectVisible={selectVisibleStats}
          onClearVisible={clearVisibleStats}
          controls={
            <StatCategoryFilterTabs
              value={selectedStatCategory}
              onChange={setSelectedStatCategory}
            />
          }
          searchPlaceholder="Search statistic..."
          maxHeightClassName="max-h-[320px]"
        />
      </div>

      <section className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-white">
              Custom Comparison
            </h3>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
              Each team-season is scored against teams from the same tournament
              and season it played in.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill label={`${selectedEntries.length} entries`} />
            <StatusPill label={`${selectedStats.length} stats`} />
            <StatusPill
              label={selectedStats.length <= 2 ? "Bar chart" : "Radar chart"}
            />
          </div>
        </div>

        {!readyForComparison ? (
          <EmptyState message="Select at least one team-season entry and one statistic to generate a comparison." />
        ) : shouldRenderBarChart ? (
          <div className="h-[520px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="statLabel"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={{ stroke: "#334155" }}
                />
                <YAxis
                  domain={[0, 100]}
                  label={{
                    value: "Relative Score (0–100)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#94a3b8",
                    fontSize: 12,
                  }}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={{ stroke: "#334155" }}
                />
                <Tooltip
                  content={
                    <BarComparisonTooltip
                      selectedEntries={displayEntries}
                    />
                  }
                />
                <Legend />
                {displayEntries.map((entry, index) => (
                  <Bar
                    key={entry.id}
                    dataKey={entry.id}
                    name={entry.label}
                    fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                    radius={[10, 10, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : shouldRenderRadarChart ? (
          <div className="h-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} outerRadius="70%">
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis
                  dataKey="statLabel"
                  tick={{ fill: "#cbd5e1", fontSize: 12 }}
                />
                <Tooltip
                  content={
                    <RadarComparisonTooltip
                      selectedEntries={displayEntries}
                    />
                  }
                />
                <Legend />
                {displayEntries.map((entry, index) => (
                  <Radar
                    key={entry.id}
                    name={entry.label}
                    dataKey={entry.id}
                    stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                    fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                    fillOpacity={0.18}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState message="No comparison values were returned for this selection." />
        )}
      </section>
    </div>
  );
}

function buildContextPools(entries: TeamSeasonStatEntry[]) {
  const pools = new Map<string, TeamSeasonStatEntry[]>();

  entries.forEach((entry) => {
    const key = getEntryContextKey(entry);
    pools.set(key, [...(pools.get(key) ?? []), entry]);
  });

  return pools;
}

function getEntryContextKey(entry: TeamSeasonStatEntry) {
  const stageKey = getEntryStageKey(entry);

  return [
    entry.tournamentId ?? "tournament:none",
    entry.seasonId ?? "season:none",
    stageKey ?? "stage:any",
  ].join("::");
}

function getEntryStageKey(entry: TeamSeasonStatEntry) {
  const entryWithStage = entry as TeamSeasonStatEntry & Record<string, unknown>;
  const stageParts = [
    entryWithStage.stageTournamentId,
    entryWithStage.standingGroupId,
    entryWithStage.stageLabel,
    entryWithStage.stageName,
    entryWithStage.groupName,
  ]
    .map((value) => (value == null ? "" : String(value).trim().toLowerCase()))
    .filter(Boolean);

  return stageParts.length > 0 ? stageParts.join("::") : null;
}

function toNumericStatValue(value: number | null | undefined) {
  return Number.isFinite(value) ? value : null;
}

function calculateContextRelativeScore(
  rawValue: number | null,
  contextPool: TeamSeasonStatEntry[],
  statKey: TeamStatKey,
) {
  if (rawValue == null) {
    return null;
  }

  const contextValues = contextPool
    .map((entry) => toNumericStatValue(entry.stats[statKey]))
    .filter((value): value is number => value != null);

  if (contextValues.length === 0) {
    return null;
  }

  if (contextValues.length === 1) {
    return 50;
  }

  const minValue = Math.min(...contextValues);
  const maxValue = Math.max(...contextValues);

  if (minValue === maxValue) {
    return 50;
  }

  const normalizedValue = ((rawValue - minValue) / (maxValue - minValue)) * 100;
  const boundedValue = Math.max(0, Math.min(100, normalizedValue));

  return isNegativeTeamStat(statKey) ? 100 - boundedValue : boundedValue;
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-300">
      {label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="min-h-[420px] rounded-[2rem] border-2 border-dashed border-slate-800 bg-slate-950/30 flex items-center justify-center text-center px-8">
      <p className="max-w-xl text-sm font-black uppercase tracking-widest text-slate-500">
        {message}
      </p>
    </div>
  );
}

function BarComparisonTooltip({
  active,
  payload,
  label,
  selectedEntries,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; color?: string; dataKey?: string; payload?: Record<string, number | string | null> }>;
  label?: string;
  selectedEntries: ComparisonDisplayEntry[];
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
        Comparison Details
      </p>
      <div className="space-y-3">
        {payload.map((item) => {
          const entry = selectedEntries.find((candidate) => candidate.id === item.dataKey);
          const rawValue = item.payload?.[`${item.dataKey}__raw`] as number | null | undefined;
          const relativeScore =
            typeof item.value === "number" ? item.value : null;
          const interpretation =
            relativeScore == null ? "N/A" : getRelativeScoreBand(relativeScore);
          const statKey = item.payload?.statKey as TeamStatKey;

          if (!entry) {
            return null;
          }

          return (
            <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-center gap-3">
                <ComparisonTooltipLogo
                  logoUrl={entry.teamLogo}
                  teamName={entry.label}
                />
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 text-sm font-bold text-white">
                  {entry.label}
                </span>
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Stat Name
              </div>
              <div className="text-sm font-bold text-slate-200">
                {label}
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Raw Number
              </div>
              <div className="text-sm font-bold text-white">
                {formatRawStatValue(rawValue, statKey)}
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Relative Score (0–100)
              </div>
              <div className="text-sm font-bold text-blue-300">
                {relativeScore == null
                  ? "N/A"
                  : formatRelativeScoreValue(relativeScore)}
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Interpretation
              </div>
              <div
                className={`text-sm font-bold ${
                  relativeScore == null
                    ? "text-slate-500"
                    : getRelativeScoreBandTextColorClass(relativeScore)
                }`}
              >
                {interpretation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadarComparisonTooltip({
  active,
  payload,
  label,
  selectedEntries,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; color?: string; dataKey?: string; payload?: Record<string, number | string | null> }>;
  label?: string;
  selectedEntries: ComparisonDisplayEntry[];
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const statKey = payload[0]?.payload?.statKey as TeamStatKey;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
        Comparison Details
      </p>
      <div className="space-y-3">
        {payload.map((item) => {
          const entry = selectedEntries.find((candidate) => candidate.id === item.dataKey);
          const rawValue = item.payload?.[`${item.dataKey}__raw`] as number | null | undefined;
          const relativeScore =
            typeof item.value === "number" ? item.value : null;
          const interpretation =
            relativeScore == null ? "N/A" : getRelativeScoreBand(relativeScore);

          if (!entry) {
            return null;
          }

          return (
            <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-center gap-3">
                <ComparisonTooltipLogo
                  logoUrl={entry.teamLogo}
                  teamName={entry.label}
                />
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 text-sm font-bold text-white">
                  {entry.label}
                </span>
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Stat Name
              </div>
              <div className="text-sm font-bold text-slate-200">
                {label}
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Raw Number
              </div>
              <div className="text-sm font-bold text-white">
                {formatRawStatValue(rawValue, statKey)}
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Relative Score (0–100)
              </div>
              <div className="text-sm font-bold text-blue-300">
                {relativeScore == null
                  ? "N/A"
                  : formatRelativeScoreValue(relativeScore)}
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Interpretation
              </div>
              <div
                className={`text-sm font-bold ${
                  relativeScore == null
                    ? "text-slate-500"
                    : getRelativeScoreBandTextColorClass(relativeScore)
                }`}
              >
                {interpretation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonTooltipLogo({
  logoUrl,
  teamName,
}: {
  logoUrl?: string | null;
  teamName: string;
}) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-slate-950/80 p-1.5 shadow-[0_8px_18px_rgba(2,6,23,0.35),0_0_14px_rgba(59,130,246,0.12)] ring-1 ring-slate-800/80">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${teamName} logo`}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      ) : (
        <Shield size={18} className="text-slate-500" />
      )}
    </span>
  );
}
