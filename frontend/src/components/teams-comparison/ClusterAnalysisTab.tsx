import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateTeamClusterElbow,
  runTeamClusters,
  type TeamClusterElbowPayload,
  type TeamClusterElbowPoint,
  type TeamClusterRunPayload,
} from "../../api/api";
import {
  formatRawStatValue,
  type TeamSeasonStatEntry,
} from "../../utils/teamsComparison";
import {
  getTeamStatMeta,
  type TeamStatKey,
} from "../../teamStatsConfig";
import SearchableCheckboxPanel from "./SearchableCheckboxPanel";

type ClusterAnalysisTabProps = {
  entries: TeamSeasonStatEntry[];
  statKeys: TeamStatKey[];
};

type TournamentOption = {
  id: number;
  name: string;
};

type SeasonOption = {
  id: number;
  name: string;
};

export default function ClusterAnalysisTab({
  entries,
  statKeys: supportedStatKeys,
}: ClusterAnalysisTabProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(
    null,
  );
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedTeamIdValues, setSelectedTeamIdValues] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<TeamStatKey[]>([]);
  const [maxK, setMaxK] = useState(8);
  const [selectedK, setSelectedK] = useState<number | null>(null);
  const [elbowResult, setElbowResult] =
    useState<TeamClusterElbowPayload | null>(null);
  const [clusterResult, setClusterResult] =
    useState<TeamClusterRunPayload | null>(null);
  const [loadingElbow, setLoadingElbow] = useState(false);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const supportedStatKeySet = useMemo(
    () => new Set(supportedStatKeys),
    [supportedStatKeys],
  );

  const tournamentOptions = useMemo<TournamentOption[]>(() => {
    const optionsById = new Map<number, TournamentOption>();

    entries.forEach((entry) => {
      if (entry.tournamentId == null) {
        return;
      }

      if (!optionsById.has(entry.tournamentId)) {
        optionsById.set(entry.tournamentId, {
          id: entry.tournamentId,
          name: entry.tournamentName ?? "Unknown league",
        });
      }
    });

    return Array.from(optionsById.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [entries]);

  const seasonOptions = useMemo<SeasonOption[]>(() => {
    if (selectedTournamentId == null) {
      return [];
    }

    const optionsById = new Map<number, SeasonOption>();

    entries
      .filter((entry) => entry.tournamentId === selectedTournamentId)
      .forEach((entry) => {
        if (!optionsById.has(entry.seasonId)) {
          optionsById.set(entry.seasonId, {
            id: entry.seasonId,
            name: entry.seasonName,
          });
        }
      });

    return Array.from(optionsById.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [entries, selectedTournamentId]);

  const contextEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.tournamentId === selectedTournamentId &&
          entry.seasonId === selectedSeasonId,
      ),
    [entries, selectedSeasonId, selectedTournamentId],
  );

  const selectedTeamIds = useMemo(
    () => selectedTeamIdValues.map((value) => Number(value)),
    [selectedTeamIdValues],
  );

  const maxAllowedK = Math.max(2, Math.min(8, selectedTeamIds.length - 1));

  const teamOptions = useMemo(
    () =>
      contextEntries
        .map((entry) => ({
          value: String(entry.teamId),
          label: entry.teamName || `Team ${entry.teamId}`,
          helperText: entry.label || `Team ${entry.teamId}`,
          kind: "team" as const,
          logoUrl: entry.teamLogo,
          tagLabel: entry.teamName || `Team ${entry.teamId}`,
          searchFields: [
            entry.teamName,
            entry.teamId,
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
          ],
        }))
        .filter(
          (option) =>
            option &&
            option.value &&
            typeof option.label === "string" &&
            option.label.trim().length > 0,
        )
        .sort((a, b) => safeCompareLabels(a.label, b.label)),
    [contextEntries],
  );

  const availableStatKeys = useMemo(() => {
    const statKeySet = new Set<TeamStatKey>();

    contextEntries.forEach((entry) => {
      Object.entries(entry.stats).forEach(([statKey, value]) => {
        const typedStatKey = statKey as TeamStatKey;

        if (value != null && supportedStatKeySet.has(typedStatKey)) {
          statKeySet.add(typedStatKey);
        }
      });
    });

    return Array.from(statKeySet)
      .filter((statKey) => Boolean(statKey))
      .sort((a, b) =>
        safeCompareLabels(getSafeStatLabel(a), getSafeStatLabel(b)),
      );
  }, [contextEntries, supportedStatKeySet]);

  const availableStatKeySet = useMemo(
    () => new Set(availableStatKeys),
    [availableStatKeys],
  );

  const cleanedSelectedStatKeys = useMemo(
    () => sanitizeSelectedStatKeys(selectedStatKeys, availableStatKeySet),
    [availableStatKeySet, selectedStatKeys],
  );

  const statOptions = useMemo(
    () =>
      availableStatKeys
        .map((statKey) => ({
          value: statKey,
          label: getSafeStatLabel(statKey),
          helperText: statKey,
          kind: "stat" as const,
          statKey,
          searchFields: [getSafeStatLabel(statKey), statKey],
        }))
        .filter(
          (option) =>
            option &&
            option.value &&
            typeof option.label === "string" &&
            option.label.trim().length > 0,
        ),
    [availableStatKeys],
  );

  const validationMessage = useMemo(() => {
    if (selectedTournamentId == null) {
      return "Select a competition.";
    }

    if (selectedSeasonId == null) {
      return "Select a season.";
    }

    if (selectedTeamIds.length < 3) {
      return "Select at least three teams.";
    }

    if (cleanedSelectedStatKeys.length < 2) {
      return "Select at least two statistics.";
    }

    return null;
  }, [
    cleanedSelectedStatKeys.length,
    selectedSeasonId,
    selectedTeamIds.length,
    selectedTournamentId,
  ]);

  useEffect(() => {
    if (
      selectedTournamentId == null ||
      !tournamentOptions.some((option) => option.id === selectedTournamentId)
    ) {
      setSelectedTournamentId(tournamentOptions[0]?.id ?? null);
    }
  }, [selectedTournamentId, tournamentOptions]);

  useEffect(() => {
    if (
      selectedSeasonId == null ||
      !seasonOptions.some((option) => option.id === selectedSeasonId)
    ) {
      setSelectedSeasonId(seasonOptions[0]?.id ?? null);
    }
  }, [seasonOptions, selectedSeasonId]);

  useEffect(() => {
    setSelectedTeamIdValues([]);
  }, [selectedSeasonId, selectedTournamentId]);

  useEffect(() => {
    if (!areStatKeyArraysEqual(selectedStatKeys, cleanedSelectedStatKeys)) {
      setSelectedStatKeys(cleanedSelectedStatKeys);
    }
  }, [cleanedSelectedStatKeys, selectedStatKeys]);

  useEffect(() => {
    setMaxK((current) => Math.min(Math.max(2, current), maxAllowedK));
  }, [maxAllowedK]);

  useEffect(() => {
    setElbowResult(null);
    setClusterResult(null);
    setSelectedK(null);
    setRequestError(null);
  }, [
    cleanedSelectedStatKeys,
    maxK,
    selectedSeasonId,
    selectedTeamIdValues,
    selectedTournamentId,
  ]);

  useEffect(() => {
    setClusterResult(null);
  }, [selectedK]);

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIdValues((current) =>
      current.includes(teamId)
        ? current.filter((value) => value !== teamId)
        : [...current, teamId],
    );
  };

  const toggleStat = (statKey: string) => {
    const typedStatKey = statKey as TeamStatKey;

    if (!availableStatKeySet.has(typedStatKey)) {
      return;
    }

    setSelectedStatKeys((current) =>
      current.includes(typedStatKey)
        ? current.filter((value) => value !== typedStatKey)
        : [...current, typedStatKey],
    );
  };

  const buildRequestPayload = () => {
    if (selectedTournamentId == null || selectedSeasonId == null) {
      return null;
    }

    return {
      tournamentId: selectedTournamentId,
      seasonId: selectedSeasonId,
      teamIds: selectedTeamIds,
      statKeys: cleanedSelectedStatKeys,
    };
  };

  const handleCalculateElbow = async () => {
    const payload = buildRequestPayload();

    if (!payload || validationMessage) {
      setRequestError(validationMessage ?? "Complete the clustering inputs.");
      return;
    }

    try {
      setLoadingElbow(true);
      setRequestError(null);
      setClusterResult(null);

      const result = await calculateTeamClusterElbow({
        ...payload,
        maxK,
      });

      setElbowResult(result);
      setSelectedK(result.suggestedK ?? Math.min(2, result.maxK));
    } catch (error) {
      setElbowResult(null);
      setRequestError(getErrorMessage(error));
    } finally {
      setLoadingElbow(false);
    }
  };

  const handleRunClusters = async () => {
    const payload = buildRequestPayload();

    if (!payload || selectedK == null) {
      setRequestError("Calculate elbow data and choose K first.");
      return;
    }

    try {
      setLoadingClusters(true);
      setRequestError(null);

      const result = await runTeamClusters({
        ...payload,
        k: selectedK,
      });

      setClusterResult(result);
    } catch (error) {
      setClusterResult(null);
      setRequestError(getErrorMessage(error));
    } finally {
      setLoadingClusters(false);
    }
  };

  const kOptions = elbowResult
    ? Array.from({ length: elbowResult.maxK - 1 }, (_, index) => index + 2)
    : [];
  const clusters = useMemo(() => {
    if (!clusterResult) {
      return [];
    }

    return Array.from({ length: clusterResult.k }, (_, index) => {
      const clusterId = index + 1;

      return {
        clusterId,
        centroid: clusterResult.centroids.find(
          (centroid) => centroid.clusterId === clusterId,
        ),
        members: clusterResult.assignments.filter(
          (assignment) => assignment.clusterId === clusterId,
        ),
      };
    });
  }, [clusterResult]);

  return (
    <div className="space-y-6">
      <section className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
        <div className="mb-8">
          <h3 className="text-xl font-black uppercase tracking-tight text-white">
            Cluster Analysis
          </h3>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3 max-w-4xl">
            Rows are selected teams. Columns are selected statistics. Each
            statistic column is Min-Max normalized to 0-1 before K-Means.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <SelectField
            label="Competition"
            value={selectedTournamentId ?? ""}
            onChange={(value) => setSelectedTournamentId(Number(value))}
            options={tournamentOptions.map((option) => ({
              value: option.id,
              label: option.name,
            }))}
          />
          <SelectField
            label="Season"
            value={selectedSeasonId ?? ""}
            onChange={(value) => setSelectedSeasonId(Number(value))}
            options={seasonOptions.map((option) => ({
              value: option.id,
              label: option.name,
            }))}
          />
          <SelectField
            label="Max K"
            value={maxK}
            onChange={(value) => setMaxK(Number(value))}
            options={Array.from({ length: maxAllowedK - 1 }, (_, index) => {
              const value = index + 2;

              return {
                value,
                label: String(value),
              };
            })}
          />
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Matrix
            </p>
            <p className="mt-2 text-sm font-black text-white">
              {selectedTeamIds.length} rows x {cleanedSelectedStatKeys.length} columns
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SearchableCheckboxPanel
            title="Teams"
            subtitle="Dataset rows"
            items={teamOptions}
            selectedValues={selectedTeamIdValues}
            onToggle={toggleTeam}
            onSelectAll={() =>
              setSelectedTeamIdValues(teamOptions.map((option) => option.value))
            }
            onClear={() => setSelectedTeamIdValues([])}
            searchPlaceholder="Search teams..."
          />
          <SearchableCheckboxPanel
            title="Statistics"
            subtitle="Dataset columns"
            items={statOptions}
            selectedValues={cleanedSelectedStatKeys}
            onToggle={toggleStat}
            onSelectAll={() => setSelectedStatKeys(availableStatKeys)}
            onClear={() => setSelectedStatKeys([])}
            searchPlaceholder="Search statistics..."
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {validationMessage ?? "Ready to calculate one global elbow curve."}
          </div>
          <button
            type="button"
            onClick={handleCalculateElbow}
            disabled={Boolean(validationMessage) || loadingElbow}
            className="rounded-2xl bg-blue-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {loadingElbow ? "Calculating..." : "Calculate Elbow"}
          </button>
        </div>

        {requestError ? (
          <MessageBox tone="error" messages={[requestError]} />
        ) : null}
      </section>

      {elbowResult ? (
        <section className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between mb-6">
            <div>
              <h4 className="text-lg font-black uppercase tracking-tight text-white">
                Elbow Method
              </h4>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
                One inertia/WCSS curve for the full selected team-stat matrix.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <SelectField
                label="Final K"
                value={selectedK ?? ""}
                onChange={(value) => setSelectedK(Number(value))}
                options={kOptions.map((value) => ({
                  value,
                  label:
                    value === elbowResult.suggestedK
                      ? `${value} suggested`
                      : String(value),
                }))}
              />
              <button
                type="button"
                onClick={handleRunClusters}
                disabled={selectedK == null || loadingClusters}
                className="rounded-2xl bg-emerald-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
              >
                {loadingClusters ? "Clustering..." : "Run K-Means"}
              </button>
            </div>
          </div>

          {elbowResult.warnings.length > 0 ? (
            <MessageBox tone="warning" messages={elbowResult.warnings} />
          ) : null}

          <div className="mt-6 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={elbowResult.elbow}
                margin={{ top: 20, right: 24, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="k"
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={{ stroke: "#334155" }}
                  label={{
                    value: "K",
                    position: "insideBottom",
                    fill: "#94a3b8",
                    offset: -5,
                  }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={{ stroke: "#334155" }}
                  label={{
                    value: "Inertia / WCSS",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#94a3b8",
                  }}
                />
                <Tooltip content={<ElbowTooltip />} />
                {elbowResult.suggestedK ? (
                  <ReferenceLine
                    x={elbowResult.suggestedK}
                    stroke="#22c55e"
                    strokeDasharray="4 4"
                    label={{
                      value: `Suggested K=${elbowResult.suggestedK}`,
                      fill: "#86efac",
                      fontSize: 12,
                    }}
                  />
                ) : null}
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
      ) : null}

      {clusterResult ? (
        <section className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl">
          <div className="mb-6">
            <h4 className="text-lg font-black uppercase tracking-tight text-white">
              Clustered Teams
            </h4>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
              Final K-Means used normalized 0-1 values only. Raw values are
              displayed for interpretation.
            </p>
          </div>

          {clusterResult.warnings.length > 0 ? (
            <MessageBox tone="warning" messages={clusterResult.warnings} />
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
            {clusters.map((cluster) => (
              <div
                key={cluster.clusterId}
                className="rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5"
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h5 className="text-sm font-black uppercase tracking-widest text-white">
                    Cluster {cluster.clusterId}
                  </h5>
                  <span className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                    {cluster.members.length} teams
                  </span>
                </div>

                <CentroidSummary
                  centroid={cluster.centroid}
                  statKeys={cleanedSelectedStatKeys}
                />

                <div className="mt-5 space-y-4">
                  {cluster.members.map((assignment) => (
                    <div
                      key={assignment.teamId}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-black uppercase tracking-widest text-white">
                          {assignment.teamName}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Distance {assignment.distanceToCentroid.toFixed(3)}
                        </p>
                      </div>
                      <TeamStatsGrid
                        assignment={assignment}
                        statKeys={cleanedSelectedStatKeys}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: Array<{ value: string | number; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm font-black uppercase tracking-widest text-white focus:border-blue-500 focus:outline-none"
      >
        {options.length === 0 ? (
          <option value="">No options</option>
        ) : (
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function MessageBox({
  tone,
  messages,
}: {
  tone: "error" | "warning";
  messages: string[];
}) {
  const toneClass =
    tone === "error"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
      : "border-yellow-500/20 bg-yellow-500/10 text-yellow-200";

  return (
    <div className={`mt-5 rounded-2xl border px-5 py-4 ${toneClass}`}>
      <ul className="space-y-2 text-xs font-bold uppercase tracking-widest">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

function CentroidSummary({
  centroid,
  statKeys,
}: {
  centroid?: { values: Partial<Record<TeamStatKey, number>> };
  statKeys: TeamStatKey[];
}) {
  if (!centroid) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
        Centroid values
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {statKeys.map((statKey) => (
          <div
            key={statKey}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="truncate font-bold text-slate-400">
              {getSafeStatLabel(statKey)}
            </span>
            <span className="font-black tabular-nums text-slate-100">
              {(centroid.values[statKey] ?? 0).toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamStatsGrid({
  assignment,
  statKeys,
}: {
  assignment: {
    rawStats: Partial<Record<TeamStatKey, number | null>>;
    normalizedStats: Partial<Record<TeamStatKey, number>>;
  };
  statKeys: TeamStatKey[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {statKeys.map((statKey) => (
        <div
          key={statKey}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-xs"
        >
          <span className="truncate font-bold text-slate-400">
            {getSafeStatLabel(statKey)}
          </span>
          <span className="font-black tabular-nums text-white">
            {formatRawStatValue(assignment.rawStats[statKey], statKey)}
          </span>
          <span className="rounded-lg bg-slate-950 px-2 py-1 font-black tabular-nums text-blue-300">
            {(assignment.normalizedStats[statKey] ?? 0).toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ElbowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TeamClusterElbowPoint }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
        k = {label}
      </div>
      <div className="mt-2 text-sm font-bold text-white">
        Inertia: {Number(point?.inertia ?? 0).toFixed(4)}
      </div>
    </div>
  );
}

function sanitizeSelectedStatKeys(
  statKeys: TeamStatKey[],
  availableStatKeys: Set<TeamStatKey>,
) {
  const cleanedStatKeys: TeamStatKey[] = [];

  statKeys.forEach((statKey) => {
    if (
      availableStatKeys.has(statKey) &&
      !cleanedStatKeys.includes(statKey)
    ) {
      cleanedStatKeys.push(statKey);
    }
  });

  return cleanedStatKeys;
}

function areStatKeyArraysEqual(left: TeamStatKey[], right: TeamStatKey[]) {
  return (
    left.length === right.length &&
    left.every((statKey, index) => statKey === right[index])
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to complete cluster analysis.";
}

function getSafeStatLabel(statKey: TeamStatKey) {
  return getTeamStatMeta(statKey)?.label ?? String(statKey);
}

function safeCompareLabels(left: string | null | undefined, right: string | null | undefined) {
  return String(left ?? "").localeCompare(String(right ?? ""));
}
