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
  type TeamClusterAssignment,
  type TeamClusterEntryRequest,
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

type ClusterAnalysisTabProps = {
  entries: TeamSeasonStatEntry[];
  statKeys: TeamStatKey[];
};

const CLUSTER_COLORS = [
  "#38bdf8",
  "#fb7185",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#f97316",
  "#2dd4bf",
  "#e879f9",
  "#84cc16",
  "#60a5fa",
];

export default function ClusterAnalysisTab({
  entries,
  statKeys: supportedStatKeys,
}: ClusterAnalysisTabProps) {
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<TeamStatKey[]>([]);
  const [selectedCountryFilter, setSelectedCountryFilter] =
    useState<CountryFilterTab>(ALL_COUNTRIES_TAB);
  const [selectedStatCategory, setSelectedStatCategory] =
    useState<StatCategoryFilterId>(ALL_STAT_CATEGORIES);
  const [maxK, setMaxK] = useState(8);
  const [selectedK, setSelectedK] = useState<number | null>(null);
  const [elbowResult, setElbowResult] =
    useState<TeamClusterElbowPayload | null>(null);
  const [clusterResult, setClusterResult] =
    useState<TeamClusterRunPayload | null>(null);
  const [loadingElbow, setLoadingElbow] = useState(false);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const clusterEntries = useMemo(
    () => entries.filter(hasClusterEntryIds),
    [entries],
  );

  const entryOptions = useMemo(
    () =>
      clusterEntries
        .map((entry) => ({
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
        }))
        .sort((a, b) => safeCompareLabels(a.label, b.label)),
    [clusterEntries],
  );

  const countryFilteredEntryOptions = useMemo(() => {
    return filterItemsByCountry(entryOptions, selectedCountryFilter);
  }, [entryOptions, selectedCountryFilter]);

  const entriesById = useMemo(
    () => new Map(clusterEntries.map((entry) => [entry.id, entry])),
    [clusterEntries],
  );

  const selectedEntries = useMemo(
    () =>
      selectedEntryIds
        .map((entryId) => entriesById.get(entryId))
        .filter((entry): entry is ClusterTeamSeasonEntry => Boolean(entry)),
    [entriesById, selectedEntryIds],
  );

  const selectedTeamSeasonEntries = useMemo<TeamClusterEntryRequest[]>(
    () =>
      selectedEntries.map((entry) => ({
        teamId: entry.teamId,
        tournamentId: entry.tournamentId,
        seasonId: entry.seasonId,
      })),
    [selectedEntries],
  );

  const maxAllowedK = Math.max(2, Math.min(20, selectedEntries.length));

  const availableStatKeys = useMemo(() => {
    return supportedStatKeys
      .filter((statKey) => Boolean(statKey))
      .sort((a, b) =>
        safeCompareLabels(getSafeStatLabel(a), getSafeStatLabel(b)),
      );
  }, [supportedStatKeys]);

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

  const categoryFilteredStatOptions = useMemo(() => {
    return filterTeamStatItemsByCategory(statOptions, selectedStatCategory);
  }, [selectedStatCategory, statOptions]);

  const validationMessage = useMemo(() => {
    if (selectedEntries.length < 3) {
      return "Select at least three team-season entries.";
    }

    if (cleanedSelectedStatKeys.length < 2) {
      return "Select at least two statistics.";
    }

    return null;
  }, [
    cleanedSelectedStatKeys.length,
    selectedEntries.length,
  ]);

  useEffect(() => {
    const availableEntryIds = new Set(clusterEntries.map((entry) => entry.id));
    setSelectedEntryIds((current) =>
      current.filter((entryId) => availableEntryIds.has(entryId)),
    );
  }, [clusterEntries]);

  useEffect(() => {
    if (!areStatKeyArraysEqual(selectedStatKeys, cleanedSelectedStatKeys)) {
      setSelectedStatKeys(cleanedSelectedStatKeys);
    }
  }, [cleanedSelectedStatKeys, selectedStatKeys]);

  useEffect(() => {
    setMaxK(maxAllowedK);
  }, [maxAllowedK]);

  useEffect(() => {
    setElbowResult(null);
    setClusterResult(null);
    setSelectedK(null);
    setRequestError(null);
  }, [cleanedSelectedStatKeys, maxK, selectedEntryIds]);

  useEffect(() => {
    setClusterResult(null);
  }, [selectedK]);

  const toggleEntry = (entryId: string) => {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((value) => value !== entryId)
        : [...current, entryId],
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

  const selectVisibleStats = (visibleStatKeys: string[]) => {
    const visibleTypedStatKeys = visibleStatKeys.filter((statKey) =>
      availableStatKeySet.has(statKey as TeamStatKey),
    ) as TeamStatKey[];

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

  const buildRequestPayload = () => {
    return {
      teamSeasonEntries: selectedTeamSeasonEntries,
      statKeys: cleanedSelectedStatKeys,
    };
  };

  const handleCalculateElbow = async () => {
    const payload = buildRequestPayload();

    if (validationMessage) {
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

    if (selectedK == null) {
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
            Rows are selected team-seasons. Columns are selected statistics. Each
            statistic column is Min-Max normalized to 0-1 before K-Means.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-4 mb-6">
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
              {selectedEntries.length} rows x {cleanedSelectedStatKeys.length} columns
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SearchableCheckboxPanel
            title="Teams"
            subtitle="Dataset rows"
            items={countryFilteredEntryOptions}
            selectionItems={entryOptions}
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
          />
          <SearchableCheckboxPanel
            title="Statistics"
            subtitle="Dataset columns"
            items={categoryFilteredStatOptions}
            selectionItems={statOptions}
            selectedValues={cleanedSelectedStatKeys}
            onToggle={toggleStat}
            onSelectVisible={selectVisibleStats}
            onClearVisible={clearVisibleStats}
            controls={
              <StatCategoryFilterTabs
                value={selectedStatCategory}
                onChange={setSelectedStatCategory}
              />
            }
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
              Clustered Entries
            </h4>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
              Final K-Means used normalized 0-1 values only. Raw values are
              displayed for interpretation.
            </p>
          </div>

          {clusterResult.warnings.length > 0 ? (
            <MessageBox tone="warning" messages={clusterResult.warnings} />
          ) : null}

          <ParallelCoordinatesPlot
            result={clusterResult}
            statKeys={cleanedSelectedStatKeys}
          />

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
                    {cluster.members.length} entries
                  </span>
                </div>

                <CentroidSummary
                  centroid={cluster.centroid}
                  statKeys={cleanedSelectedStatKeys}
                />

                <div className="mt-5 space-y-4">
                  {cluster.members.map((assignment) => (
                    <div
                      key={assignment.entryId}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black uppercase tracking-widest text-white">
                            {assignment.teamName}
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {formatAssignmentContext(assignment)}
                          </p>
                        </div>
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

function ParallelCoordinatesPlot({
  result,
  statKeys,
}: {
  result: TeamClusterRunPayload;
  statKeys: TeamStatKey[];
}) {
  const [hovered, setHovered] = useState<{
    assignmentIndex: number;
    statKey: TeamStatKey | null;
  } | null>(null);
  const width = Math.max(760, statKeys.length * 120);
  const height = 420;
  const margin = { top: 28, right: 28, bottom: 86, left: 56 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const getX = (index: number) =>
    margin.left + (plotWidth * index) / Math.max(1, statKeys.length - 1);
  const getY = (value: number | null | undefined) =>
    margin.top + (1 - clamp01(Number(value ?? 0))) * plotHeight;
  const makePath = (assignment: TeamClusterAssignment) =>
    statKeys
      .map((statKey, index) => {
        const command = index === 0 ? "M" : "L";
        return `${command} ${getX(index)} ${getY(
          assignment.normalizedStats[statKey],
        )}`;
      })
      .join(" ");
  const pathRows = result.assignments.map((assignment, index) => {
    const path = makePath(assignment);

    return {
      assignment,
      index,
      path,
      normalizedVectorKey: makeNormalizedVectorKey(assignment, statKeys),
    };
  });
  const activeRow =
    hovered == null ? null : pathRows[hovered.assignmentIndex] ?? null;
  const activeStatKey = hovered?.statKey ?? null;
  const activeOverlapRows = activeRow
    ? getOverlappingPathRows(pathRows, activeRow)
    : [];
  const activeOverlapIndexes = new Set(
    activeOverlapRows.map((row) => row.index),
  );
  const activeOverlapCount = activeOverlapRows.length;
  const renderedPathCount = pathRows.length;
  const assignmentCount = result.assignments.length;

  return (
    <div className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h5 className="text-sm font-black uppercase tracking-widest text-white">
            Parallel Coordinates
          </h5>
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Normalized 0-1 team-stat profiles grouped by cluster.
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
            Showing {renderedPathCount} of {assignmentCount} entries
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: result.k }, (_, index) => {
            const clusterId = index + 1;

            return (
              <span
                key={clusterId}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: getClusterColor(clusterId) }}
                />
                Cluster {clusterId}
              </span>
            );
          })}
        </div>
      </div>

      <div
        className={
          statKeys.length > 7
            ? "overflow-x-auto overflow-y-hidden"
            : "overflow-hidden"
        }
      >
        <svg
          role="img"
          aria-label="Parallel coordinates plot of normalized team cluster statistics"
          viewBox={`0 0 ${width} ${height}`}
          className="h-[420px] max-w-none"
          style={{ width: statKeys.length > 7 ? width : "100%" }}
          onMouseLeave={() => setHovered(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={getY(tick)}
                y2={getY(tick)}
                stroke="#1e293b"
                strokeDasharray={tick === 0 || tick === 1 ? "0" : "3 3"}
              />
              <text
                x={margin.left - 12}
                y={getY(tick) + 4}
                textAnchor="end"
                fill="#64748b"
                fontSize="11"
                fontWeight="800"
              >
                {tick.toFixed(2)}
              </text>
            </g>
          ))}

          {statKeys.map((statKey, index) => {
            const x = getX(index);

            return (
              <g key={statKey}>
                <line
                  x1={x}
                  x2={x}
                  y1={margin.top}
                  y2={height - margin.bottom}
                  stroke="#475569"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={height - margin.bottom + 28}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="11"
                  fontWeight="900"
                >
                  <title>{getSafeStatLabel(statKey)}</title>
                  {truncateLabel(getSafeStatLabel(statKey), 14)}
                </text>
              </g>
            );
          })}

          {pathRows.map((row) => {
            const isActive = activeOverlapIndexes.has(row.index);
            const hasActiveGroup = activeOverlapIndexes.size > 0;
            const overlapRows = getOverlappingPathRows(pathRows, row);

            return (
              <path
                key={`${row.assignment.entryId}-${row.index}-path`}
                d={row.path}
                fill="none"
                stroke={getClusterColor(row.assignment.clusterId)}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive ? 4 : 1.75}
                strokeOpacity={isActive ? 0.98 : hasActiveGroup ? 0.12 : 0.68}
                pointerEvents="stroke"
                onMouseEnter={() =>
                  setHovered({ assignmentIndex: row.index, statKey: null })
                }
              >
                <title>
                  {overlapRows.length > 1
                    ? `${overlapRows.length} entries overlap: ${overlapRows
                        .map(
                          (overlapRow) =>
                            `${overlapRow.assignment.teamName} (Cluster ${overlapRow.assignment.clusterId})`,
                        )
                        .join(", ")}`
                    : `${row.assignment.teamName}, Cluster ${row.assignment.clusterId}`}
                </title>
              </path>
            );
          })}

          {pathRows.flatMap((row) => {
            const overlapRows = getOverlappingPathRows(pathRows, row);
            const overlapIndex = overlapRows.findIndex(
              (overlapRow) => overlapRow.index === row.index,
            );
            const markerOffsetX =
              overlapRows.length > 1
                ? getOverlapMarkerOffset(overlapRows.length, overlapIndex)
                : 0;

            return statKeys.map((statKey, index) => {
              const isActiveGroup = activeOverlapIndexes.has(row.index);
              const isActive =
                isActiveGroup &&
                (activeStatKey == null || activeStatKey === statKey);
              const hasActiveGroup = activeOverlapIndexes.size > 0;

              return (
                <circle
                  key={`${row.assignment.entryId}-${row.index}-${statKey}`}
                  cx={getX(index) + markerOffsetX}
                  cy={getY(row.assignment.normalizedStats[statKey])}
                  r={isActive ? 4.75 : 3}
                  fill={getClusterColor(row.assignment.clusterId)}
                  fillOpacity={hasActiveGroup && !isActiveGroup ? 0.24 : 0.96}
                  stroke="#020617"
                  strokeWidth={isActive ? 1.5 : 1}
                  onMouseEnter={() =>
                    setHovered({ assignmentIndex: row.index, statKey })
                  }
                />
              );
            });
          })}
        </svg>
      </div>

      <div className="mt-4 min-h-[5.5rem] rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        {activeRow ? (
          <>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-black uppercase tracking-widest text-white">
                {activeOverlapCount > 1
                  ? `${activeOverlapCount} entries overlap`
                  : activeRow.assignment.teamName}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {activeStatKey
                  ? getSafeStatLabel(activeStatKey)
                  : "Complete profile"}
              </p>
            </div>
            {activeOverlapCount > 1 ? (
              <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Marker offsets are visual only; normalized values are unchanged.
              </p>
            ) : null}
            <div className="mt-3 space-y-4">
              {activeOverlapRows.map((row) => (
                <div
                  key={`${row.assignment.entryId}-${row.index}-details`}
                  className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3"
                >
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white">
                        {row.assignment.teamName}
                      </p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {formatAssignmentContext(row.assignment)}
                      </p>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Cluster {row.assignment.clusterId}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {(activeStatKey ? [activeStatKey] : statKeys).map(
                      (statKey) => (
                        <div
                          key={statKey}
                          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-xs"
                        >
                          <span className="truncate font-bold text-slate-400">
                            {getSafeStatLabel(statKey)}
                          </span>
                          <span className="font-black tabular-nums text-white">
                            {formatRawStatValue(
                              row.assignment.rawStats[statKey],
                              statKey,
                            )}
                          </span>
                          <span className="rounded-lg bg-slate-950 px-2 py-1 font-black tabular-nums text-blue-300">
                            {formatNormalizedStatValue(
                              row.assignment.normalizedStats[statKey],
                            )}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Hover a line or point to inspect team, cluster, normalized values,
            and raw values.
          </p>
        )}
      </div>
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

type ClusterTeamSeasonEntry = TeamSeasonStatEntry & {
  tournamentId: number;
};

function hasClusterEntryIds(
  entry: TeamSeasonStatEntry,
): entry is ClusterTeamSeasonEntry {
  return (
    Number.isInteger(entry.teamId) &&
    Number.isInteger(entry.tournamentId) &&
    Number.isInteger(entry.seasonId)
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

function formatAssignmentContext(assignment: TeamClusterAssignment) {
  return [
    assignment.seasonName || `Season ${assignment.seasonId}`,
    assignment.tournamentName ?? "Unknown league",
  ].join(" • ");
}

function getClusterColor(clusterId: number) {
  return CLUSTER_COLORS[(clusterId - 1) % CLUSTER_COLORS.length];
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function truncateLabel(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}...`
    : value;
}

type ParallelCoordinatesPathRow = {
  assignment: TeamClusterAssignment;
  index: number;
  path: string;
  normalizedVectorKey: string;
};

function getOverlappingPathRows(
  rows: ParallelCoordinatesPathRow[],
  target: ParallelCoordinatesPathRow,
) {
  return rows.filter(
    (row) =>
      row.path === target.path ||
      row.normalizedVectorKey === target.normalizedVectorKey,
  );
}

function makeNormalizedVectorKey(
  assignment: TeamClusterAssignment,
  statKeys: TeamStatKey[],
) {
  return statKeys
    .map((statKey) =>
      formatNormalizedStatValue(assignment.normalizedStats[statKey]),
    )
    .join("|");
}

function formatNormalizedStatValue(value: number | null | undefined) {
  return clamp01(Number(value ?? 0)).toFixed(3);
}

function getOverlapMarkerOffset(overlapCount: number, overlapIndex: number) {
  const centeredIndex = overlapIndex - (overlapCount - 1) / 2;
  const offset = centeredIndex * 5;

  return Math.max(-10, Math.min(10, offset));
}

function safeCompareLabels(left: string | null | undefined, right: string | null | undefined) {
  return String(left ?? "").localeCompare(String(right ?? ""));
}
