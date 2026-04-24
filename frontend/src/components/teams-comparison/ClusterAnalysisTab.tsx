import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { runKMeans } from "../../utils/kmeans";
import {
  TEAM_COMPARISON_STAT_KEYS,
  buildStatRanges,
  getNormalizedEntryStat,
  type TeamSeasonStatEntry,
} from "../../utils/teamsComparison";

type ClusterAnalysisTabProps = {
  entries: TeamSeasonStatEntry[];
};

export default function ClusterAnalysisTab({
  entries,
}: ClusterAnalysisTabProps) {
  const maxClusterCount = Math.max(1, Math.min(8, entries.length));
  const [clusterCount, setClusterCount] = useState(
    Math.min(3, Math.max(1, maxClusterCount)),
  );

  const ranges = useMemo(() => buildStatRanges(entries), [entries]);

  const matrix = useMemo(
    () =>
      entries.map((entry) =>
        TEAM_COMPARISON_STAT_KEYS.map((statKey) =>
          Number(getNormalizedEntryStat(entry, statKey, ranges).toFixed(4)),
        ),
      ),
    [entries, ranges],
  );

  const elbowData = useMemo(() => {
    if (matrix.length === 0) {
      return [];
    }

    return Array.from({ length: maxClusterCount }, (_, index) => {
      const k = index + 1;
      const result = runKMeans(matrix, k);

      return {
        k,
        inertia: Number(result.inertia.toFixed(2)),
      };
    });
  }, [matrix, maxClusterCount]);

  const clusterResult = useMemo(
    () => runKMeans(matrix, clusterCount),
    [clusterCount, matrix],
  );

  const clusters = useMemo(
    () =>
      Array.from({ length: Math.max(1, clusterCount) }, (_, clusterIndex) => ({
        clusterIndex,
        members: entries.filter(
          (_, entryIndex) => clusterResult.assignments[entryIndex] === clusterIndex,
        ),
      })).filter((cluster) => cluster.members.length > 0),
    [clusterCount, clusterResult.assignments, entries],
  );

  return (
    <div className="space-y-6">
      <section className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-white">
              Cluster Analysis
            </h3>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3 max-w-3xl">
              Every row is a team-season entry. Every column is a team statistic
              normalized to a 0-100 scale, with negative stats reverse-normalized.
            </p>
          </div>

          <div className="w-full lg:w-[240px]">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
              Number of clusters
            </label>
            <select
              value={clusterCount}
              onChange={(event) => setClusterCount(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm font-black uppercase tracking-widest text-white focus:outline-none focus:border-blue-500"
            >
              {Array.from({ length: maxClusterCount }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? "Cluster" : "Clusters"}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetricCard label="Entries" value={String(entries.length)} />
          <MetricCard
            label="Statistics"
            value={String(TEAM_COMPARISON_STAT_KEYS.length)}
          />
          <MetricCard
            label="Iterations"
            value={String(clusterResult.iterations)}
          />
        </div>

        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={elbowData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="k"
                allowDecimals={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={{ stroke: "#334155" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={{ stroke: "#334155" }}
              />
              <Tooltip content={<ElbowTooltip />} />
              <Line
                type="monotone"
                dataKey="inertia"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#60a5fa", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
        <div className="mb-8">
          <h4 className="text-lg font-black uppercase tracking-tight text-white">
            Cluster Assignments
          </h4>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
            Lower elbow inertia usually indicates tighter clusters. Choose the
            point where improvements begin to flatten.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {clusters.map((cluster) => (
            <div
              key={cluster.clusterIndex}
              className="rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5"
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <h5 className="text-sm font-black uppercase tracking-widest text-white">
                  Cluster {cluster.clusterIndex + 1}
                </h5>
                <span className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400">
                  {cluster.members.length} entries
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {cluster.members.map((entry) => (
                  <span
                    key={entry.id}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-200"
                  >
                    {entry.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="text-3xl font-black text-white mt-3">{value}</p>
    </div>
  );
}

function ElbowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
        k = {label}
      </div>
      <div className="text-sm font-bold text-white mt-2">
        Inertia: {Number(payload[0].value ?? 0).toFixed(2)}
      </div>
    </div>
  );
}
