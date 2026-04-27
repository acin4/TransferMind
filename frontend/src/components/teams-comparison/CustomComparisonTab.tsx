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
import {
  formatRawStatValue,
  formatRelativeScoreValue,
  getNormalizedEntryStat,
  getRelativeScoreBand,
  getRelativeScoreBandTextColorClass,
  type StatRange,
  type TeamSeasonStatEntry,
} from "../../utils/teamsComparison";
import {
  getTeamStatMeta,
  type TeamStatKey,
} from "../../teamStatsConfig";
import SearchableCheckboxPanel from "./SearchableCheckboxPanel";

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
  statRanges: Map<TeamStatKey, StatRange>;
  statKeys: TeamStatKey[];
};

export default function CustomComparisonTab({
  entries,
  statRanges,
  statKeys,
}: CustomComparisonTabProps) {
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<TeamStatKey[]>([]);

  const entryOptions = useMemo(
    () =>
      entries.map((entry) => ({
        value: entry.id,
        label: entry.label,
        helperText: `Team ${entry.teamId} • Season ${entry.seasonId}`,
      })),
    [entries],
  );

  const statOptions = useMemo(
    () =>
      statKeys.map((statKey) => ({
        value: statKey,
        label: getTeamStatMeta(statKey).label,
        helperText: statKey,
      })),
    [statKeys],
  );

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedEntryIds.includes(entry.id)),
    [entries, selectedEntryIds],
  );

  const selectedStats = useMemo(
    () => statKeys.filter((statKey) => selectedStatKeys.includes(statKey)),
    [selectedStatKeys, statKeys],
  );

  const chartData = useMemo(
    () =>
      selectedStats.map((statKey) => {
        const row: Record<string, number | string | null> = {
          statKey,
          statLabel: getTeamStatMeta(statKey).label,
        };

        selectedEntries.forEach((entry) => {
          row[entry.id] = Number(
            getNormalizedEntryStat(entry, statKey, statRanges).toFixed(2),
          );
          row[`${entry.id}__raw`] = entry.stats[statKey] ?? null;
        });

        return row;
      }),
    [selectedEntries, selectedStats, statRanges],
  );

  const readyForComparison =
    selectedEntries.length >= 2 && selectedStats.length >= 1;
  const shouldRenderBarChart =
    readyForComparison && selectedStats.length <= 2;
  const shouldRenderRadarChart =
    readyForComparison && selectedStats.length > 2;

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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
      <div className="space-y-6">
        <SearchableCheckboxPanel
          title="Team + Season Entries"
          subtitle="Select at least two entries"
          items={entryOptions}
          selectedValues={selectedEntryIds}
          onToggle={toggleEntry}
          onSelectAll={() => setSelectedEntryIds(entryOptions.map((item) => item.value))}
          onClear={() => setSelectedEntryIds([])}
          searchPlaceholder="Search team or season..."
          maxHeightClassName="max-h-[360px]"
        />

        <SearchableCheckboxPanel
          title="Statistics"
          subtitle="Pick one or more team stats"
          items={statOptions}
          selectedValues={selectedStatKeys}
          onToggle={toggleStat}
          onSelectAll={() => setSelectedStatKeys(statKeys)}
          onClear={() => setSelectedStatKeys([])}
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
              Relative Score (0–100) is calculated across all loaded team-season
              entries, while raw values remain the real football statistics.
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
          <EmptyState message="Select at least two team-season entries and one statistic to generate a comparison." />
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
                      selectedEntries={selectedEntries}
                    />
                  }
                />
                <Legend />
                {selectedEntries.map((entry, index) => (
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
                      selectedEntries={selectedEntries}
                    />
                  }
                />
                <Legend />
                {selectedEntries.map((entry, index) => (
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
        ) : null}
      </section>
    </div>
  );
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
  selectedEntries: TeamSeasonStatEntry[];
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
          const relativeScore = Number(item.value ?? 50);
          const interpretation = getRelativeScoreBand(relativeScore);
          const statKey = item.payload?.statKey as TeamStatKey;

          if (!entry) {
            return null;
          }

          return (
            <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {entry.label}
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
                {formatRelativeScoreValue(relativeScore)}
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Interpretation
              </div>
              <div className={`text-sm font-bold ${getRelativeScoreBandTextColorClass(relativeScore)}`}>
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
  selectedEntries: TeamSeasonStatEntry[];
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
          const relativeScore = Number(item.value ?? 50);
          const interpretation = getRelativeScoreBand(relativeScore);

          if (!entry) {
            return null;
          }

          return (
            <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {entry.label}
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
                {formatRelativeScoreValue(relativeScore)}
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Interpretation
              </div>
              <div className={`text-sm font-bold ${getRelativeScoreBandTextColorClass(relativeScore)}`}>
                {interpretation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
