import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
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
import {
  CLUSTER_COLORS,
  CHART_Y_TICKS,
  CHART_MARGIN,
  CLUSTER_AVERAGE_CHART_HEIGHT,
  PARALLEL_COORDINATES_CHART_HEIGHT,
  MIN_CHART_WIDTH,
  STAT_AXIS_WIDTH,
} from "../cluster-analysis/constants";
import type {
  ClusterAnalysisTabProps,
  ClusterProfile,
  ClusterInsightStat,
  ClusterLegendItem,
  ClusterFilterValue,
  StatDisplayItem,
  ParallelCoordinatesPoint,
  ParallelCoordinatesPathRow,
  ClusterTeamSeasonEntry,
  SelectFieldProps,
  MessageBoxProps,
  ClusterAverageProfilesChartProps,
  ClusterLegendProps,
  ClusterSelectionControlsProps,
  ClusterAverageDetailsPanelProps,
  ParallelCoordinatesPlotProps,
  EntrySelectionListProps,
  SelectedEntryDetailsPanelProps,
  ClusterMembershipSummaryProps,
  ClusterFilterControlsProps,
  ElbowTooltipProps,
} from "../cluster-analysis/types";

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

  const kOptions = useMemo(
    () =>
      elbowResult
        ? Array.from({ length: elbowResult.maxK - 1 }, (_, index) => index + 2)
        : [],
    [elbowResult],
  );
  const clusterAssignments = clusterResult?.assignments;
  const clusterK = clusterResult?.k ?? 0;
  const clusters = useMemo(() => {
    if (!clusterAssignments) {
      return [];
    }

    return buildClusterGroups(clusterAssignments, clusterK);
  }, [clusterAssignments, clusterK]);
  const clusterProfiles = useMemo(() => {
    if (!clusterAssignments) {
      return [];
    }

    return buildClusterProfiles(
      clusterAssignments,
      cleanedSelectedStatKeys,
      clusterK,
    );
  }, [cleanedSelectedStatKeys, clusterAssignments, clusterK]);

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

          <ClusterAverageProfilesChart
            profiles={clusterProfiles}
            statKeys={cleanedSelectedStatKeys}
          />

          <ParallelCoordinatesPlot
            result={clusterResult}
            statKeys={cleanedSelectedStatKeys}
          />

          <ClusterMembershipSummary clusters={clusters} />
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
}: SelectFieldProps) {
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
}: MessageBoxProps) {
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

const ClusterAverageProfilesChart = memo(function ClusterAverageProfilesChart({
  profiles,
  statKeys,
}: ClusterAverageProfilesChartProps) {
  const [selectedAverageClusterId, setSelectedAverageClusterId] =
    useState<number | null>(null);
  const statItems = useMemo(() => buildStatDisplayItems(statKeys), [statKeys]);
  const width = getChartWidth(statItems.length);
  const height = CLUSTER_AVERAGE_CHART_HEIGHT;
  const plotWidth = width - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const xCoordinates = useMemo(
    () => buildXCoordinates(statItems.length, plotWidth),
    [plotWidth, statItems.length],
  );
  const svgStyle = useMemo(
    () => ({ width: statItems.length > 7 ? width : "100%" }),
    [statItems.length, width],
  );
  const getY = useCallback(
    (value: number | null | undefined) =>
      CHART_MARGIN.top + (1 - getNormalizedDisplayValue(value)) * plotHeight,
    [plotHeight],
  );
  const chartRows = useMemo(
    () =>
      profiles.map((profile) => {
        const color = getClusterColor(profile.clusterId);
        const points = statItems.map((statItem, index) => {
          const value = profile.averages[statItem.statKey];

          return {
            ...statItem,
            x: xCoordinates[index],
            y: getY(value),
            value,
          };
        });

        return {
          profile,
          color,
          path: points
            .map(
              (point, index) =>
                `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
            )
            .join(" "),
          points,
        };
      }),
    [getY, profiles, statItems, xCoordinates],
  );
  const sortedProfiles = useMemo(
    () =>
      profiles
        .slice()
        .sort((left, right) => left.clusterId - right.clusterId),
    [profiles],
  );
  const selectedAverageProfile = useMemo(
    () =>
      selectedAverageClusterId == null
        ? null
        : profiles.find(
            (profile) => profile.clusterId === selectedAverageClusterId,
          ) ?? null,
    [profiles, selectedAverageClusterId],
  );
  const selectedAverageRow = useMemo(
    () =>
      selectedAverageClusterId == null
        ? null
        : chartRows.find(
            (row) => row.profile.clusterId === selectedAverageClusterId,
          ) ?? null,
    [chartRows, selectedAverageClusterId],
  );
  const selectAverageCluster = useCallback((clusterId: number) => {
    setSelectedAverageClusterId((current) =>
      current === clusterId ? current : clusterId,
    );
  }, []);
  const clearAverageCluster = useCallback(() => {
    setSelectedAverageClusterId(null);
  }, []);

  useEffect(() => {
    if (
      selectedAverageClusterId != null &&
      !profiles.some((profile) => profile.clusterId === selectedAverageClusterId)
    ) {
      setSelectedAverageClusterId(null);
    }
  }, [profiles, selectedAverageClusterId]);

  return (
    <div className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h5 className="text-sm font-black uppercase tracking-widest text-white">
            Cluster Average Profiles
          </h5>
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Mean normalized 0-1 values for every selected statistic.
          </p>
        </div>
        <ClusterLegend items={sortedProfiles} />
      </div>

      <ClusterSelectionControls
        profiles={sortedProfiles}
        selectedClusterId={selectedAverageClusterId}
        onSelect={selectAverageCluster}
        onClear={clearAverageCluster}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div
          className={
            statItems.length > 7
              ? "overflow-x-auto overflow-y-hidden"
              : "overflow-hidden"
          }
        >
          <svg
            role="img"
            aria-label="Cluster average profile chart of normalized team statistics"
            viewBox={`0 0 ${width} ${height}`}
            className="h-[360px] max-w-none"
            style={svgStyle}
          >
            {CHART_Y_TICKS.map((tick) => (
              <g key={tick}>
                <line
                  x1={CHART_MARGIN.left}
                  x2={width - CHART_MARGIN.right}
                  y1={getY(tick)}
                  y2={getY(tick)}
                  stroke="#1e293b"
                  strokeDasharray={tick === 0 || tick === 1 ? "0" : "3 3"}
                />
                <text
                  x={CHART_MARGIN.left - 12}
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

            {statItems.map((statItem, index) => (
              <g key={statItem.statKey}>
                <line
                  x1={xCoordinates[index]}
                  x2={xCoordinates[index]}
                  y1={CHART_MARGIN.top}
                  y2={height - CHART_MARGIN.bottom}
                  stroke="#475569"
                  strokeWidth="1.5"
                />
                <text
                  x={xCoordinates[index]}
                  y={height - CHART_MARGIN.bottom + 28}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="11"
                  fontWeight="900"
                  aria-label={statItem.label}
                >
                  {statItem.shortLabel}
                </text>
              </g>
            ))}

            {chartRows.map((row) => {
              const isSelected =
                selectedAverageClusterId === row.profile.clusterId;
              const hasSelection = selectedAverageClusterId != null;

              return (
                <path
                  key={`cluster-${row.profile.clusterId}-average-path`}
                  d={row.path}
                  fill="none"
                  stroke={row.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isSelected ? 4.25 : 2.4}
                  strokeOpacity={isSelected ? 0.98 : hasSelection ? 0.18 : 0.9}
                  pointerEvents="none"
                  aria-label={`Cluster ${row.profile.clusterId}, ${row.profile.members.length} entries`}
                />
              );
            })}

            {selectedAverageRow
              ? selectedAverageRow.points.map((point) => (
                  <circle
                    key={`cluster-${selectedAverageRow.profile.clusterId}-${point.statKey}-average-point`}
                    cx={point.x}
                    cy={point.y}
                    r={4.5}
                    fill={selectedAverageRow.color}
                    stroke="#020617"
                    strokeWidth={1.5}
                  />
                ))
              : null}
          </svg>
        </div>

        <ClusterAverageDetailsPanel
          profile={selectedAverageProfile}
          statItems={statItems}
        />
      </div>
    </div>
  );
});

const ClusterLegend = memo(function ClusterLegend({
  items,
}: ClusterLegendProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.clusterId}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getClusterColor(item.clusterId) }}
          />
          Cluster {item.clusterId}
        </span>
      ))}
    </div>
  );
});

const ClusterSelectionControls = memo(function ClusterSelectionControls({
  profiles,
  selectedClusterId,
  onSelect,
  onClear,
}: ClusterSelectionControlsProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {profiles.map((profile) => (
        <button
          key={profile.clusterId}
          type="button"
          onClick={() => onSelect(profile.clusterId)}
          className={getClusterFilterButtonClass(
            selectedClusterId === profile.clusterId,
          )}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getClusterColor(profile.clusterId) }}
          />
          Cluster {profile.clusterId} · {profile.members.length} entries
        </button>
      ))}
      {selectedClusterId == null ? null : (
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100"
        >
          Clear selection
        </button>
      )}
    </div>
  );
});

const ClusterAverageDetailsPanel = memo(function ClusterAverageDetailsPanel({
  profile,
  statItems,
}: ClusterAverageDetailsPanelProps) {
  return (
    <div className="min-h-[360px] rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      {profile ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-black uppercase tracking-widest text-white">
              Cluster {profile.clusterId}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {profile.members.length} entries
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs font-bold uppercase tracking-widest">
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
              <p className="mb-2 text-[10px] font-black text-slate-500">
                Strongest Statistics
              </p>
              <p className="text-slate-300">
                {formatInsightLabels(profile.strongest)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
              <p className="mb-2 text-[10px] font-black text-slate-500">
                Weakest Statistics
              </p>
              <p className="text-slate-300">
                {formatInsightLabels(profile.weakest)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-[minmax(0,1fr)_88px] bg-slate-950/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Statistic</span>
              <span className="text-right">Average</span>
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              {statItems.map((statItem) => (
                <div
                  key={statItem.statKey}
                  className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 border-t border-slate-800/70 px-3 py-2 text-xs"
                >
                  <span className="truncate font-bold text-slate-300">
                    {statItem.label}
                  </span>
                  <span className="text-right font-black tabular-nums text-blue-300">
                    {formatNormalizedStatValue(
                      profile.averages[statItem.statKey],
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Select a cluster to inspect its average profile.
        </p>
      )}
    </div>
  );
});

const ParallelCoordinatesPlot = memo(function ParallelCoordinatesPlot({
  result,
  statKeys,
}: ParallelCoordinatesPlotProps) {
  const [selectedClusterFilter, setSelectedClusterFilter] =
    useState<ClusterFilterValue>("all");
  const [selectedDetailEntryId, setSelectedDetailEntryId] =
    useState<string | null>(null);
  const [entrySearch, setEntrySearch] = useState("");
  const statItems = useMemo(() => buildStatDisplayItems(statKeys), [statKeys]);
  const width = getChartWidth(statItems.length);
  const height = PARALLEL_COORDINATES_CHART_HEIGHT;
  const plotWidth = width - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const clusterFilters = useMemo(() => getClusterFilterOptions(result), [result]);
  const xCoordinates = useMemo(
    () => buildXCoordinates(statItems.length, plotWidth),
    [plotWidth, statItems.length],
  );
  const svgStyle = useMemo(
    () => ({ width: statItems.length > 7 ? width : "100%" }),
    [statItems.length, width],
  );
  const getY = useCallback(
    (value: number | null | undefined) =>
      CHART_MARGIN.top + (1 - getNormalizedDisplayValue(value)) * plotHeight,
    [plotHeight],
  );
  const allPathRows = useMemo<ParallelCoordinatesPathRow[]>(
    () =>
      result.assignments.map((assignment, index) => {
        const color = getClusterColor(assignment.clusterId);
        const points = statItems.map((statItem, statIndex) => {
          const rawValue = assignment.rawStats?.[statItem.statKey];
          const normalizedValue = assignment.normalizedStats?.[statItem.statKey];

          return {
            ...statItem,
            x: xCoordinates[statIndex],
            y: getY(normalizedValue),
            rawDisplayValue: formatDisplayRawStatValue(
              rawValue,
              statItem.statKey,
            ),
            normalizedDisplayValue: formatNormalizedStatValue(normalizedValue),
          };
        });

        return {
          assignment,
          color,
          index,
          path: points
            .map(
              (point, pointIndex) =>
                `${pointIndex === 0 ? "M" : "L"} ${point.x} ${point.y}`,
            )
            .join(" "),
          points,
          pointsByStatKey: Object.fromEntries(
            points.map((point) => [point.statKey, point]),
          ) as Partial<Record<TeamStatKey, ParallelCoordinatesPoint>>,
        };
      }),
    [getY, result.assignments, statItems, xCoordinates],
  );
  const clusterFilteredPathRows = useMemo(
    () =>
      allPathRows.filter(
        (row) =>
          selectedClusterFilter === "all" ||
          row.assignment.clusterId === selectedClusterFilter,
      ),
    [allPathRows, selectedClusterFilter],
  );
  const normalizedEntrySearch = entrySearch.trim().toLowerCase();
  const searchedEntryRows = useMemo(
    () =>
      normalizedEntrySearch.length === 0
        ? clusterFilteredPathRows
        : clusterFilteredPathRows.filter((row) =>
            getAssignmentSearchText(row.assignment).includes(
              normalizedEntrySearch,
            ),
          ),
    [clusterFilteredPathRows, normalizedEntrySearch],
  );
  const selectedDetailRow = useMemo(
    () =>
      selectedDetailEntryId == null
        ? null
        : searchedEntryRows.find(
            (row) => row.assignment.entryId === selectedDetailEntryId,
          ) ?? null,
    [searchedEntryRows, selectedDetailEntryId],
  );
  const orderedPathRows = useMemo(() => {
    if (!selectedDetailRow) {
      return searchedEntryRows;
    }

    return [
      ...searchedEntryRows.filter(
        (row) => row.assignment.entryId !== selectedDetailRow.assignment.entryId,
      ),
      selectedDetailRow,
    ];
  }, [searchedEntryRows, selectedDetailRow]);
  const selectedDetailPoints = selectedDetailRow?.points ?? [];
  const renderedPathCount = searchedEntryRows.length;
  const assignmentCount = result.assignments.length;
  const hasVisibleRows = searchedEntryRows.length > 0;
  const selectDetailEntry = useCallback((entryId: string) => {
    setSelectedDetailEntryId((current) =>
      current === entryId ? null : entryId,
    );
  }, []);
  const clearDetailEntry = useCallback(() => {
    setSelectedDetailEntryId(null);
  }, []);
  const handleEntrySearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setEntrySearch(event.target.value);
    },
    [],
  );
  const clearEntrySearch = useCallback(() => {
    setEntrySearch("");
  }, []);
  const selectClusterFilter = useCallback((value: ClusterFilterValue) => {
    setSelectedClusterFilter((current) => (current === value ? current : value));
  }, []);

  useEffect(() => {
    const availableClusterIds = new Set(clusterFilters.map((option) => option.clusterId));

    if (
      selectedClusterFilter !== "all" &&
      !availableClusterIds.has(selectedClusterFilter)
    ) {
      setSelectedClusterFilter("all");
    }
  }, [clusterFilters, selectedClusterFilter]);

  useEffect(() => {
    if (
      selectedDetailEntryId != null &&
      !searchedEntryRows.some(
        (row) => row.assignment.entryId === selectedDetailEntryId,
      )
    ) {
      setSelectedDetailEntryId(null);
    }
  }, [searchedEntryRows, selectedDetailEntryId]);

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
        <ClusterLegend items={clusterFilters} />
      </div>

      <ClusterFilterControls
        options={clusterFilters}
        value={selectedClusterFilter}
        onChange={selectClusterFilter}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <EntrySelectionList
          rows={searchedEntryRows}
          searchValue={entrySearch}
          selectedEntryId={selectedDetailEntryId}
          onSearchChange={handleEntrySearchChange}
          onClearSearch={clearEntrySearch}
          onSelect={selectDetailEntry}
        />

        <div>
          <div
            className={
              statItems.length > 7
                ? "overflow-x-auto overflow-y-hidden"
                : "overflow-hidden"
            }
          >
            <svg
              role="img"
              aria-label="Parallel coordinates plot of normalized team cluster statistics"
              viewBox={`0 0 ${width} ${height}`}
              className="h-[420px] max-w-none"
              style={svgStyle}
            >
              {!hasVisibleRows ? (
                <text
                  x={width / 2}
                  y={height / 2}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="12"
                  fontWeight="900"
                >
                  No entries match the current filters.
                </text>
              ) : null}

              {CHART_Y_TICKS.map((tick) => (
                <g key={tick}>
                  <line
                    x1={CHART_MARGIN.left}
                    x2={width - CHART_MARGIN.right}
                    y1={getY(tick)}
                    y2={getY(tick)}
                    stroke="#1e293b"
                    strokeDasharray={tick === 0 || tick === 1 ? "0" : "3 3"}
                  />
                  <text
                    x={CHART_MARGIN.left - 12}
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

              {statItems.map((statItem, index) => (
                <g key={statItem.statKey}>
                  <line
                    x1={xCoordinates[index]}
                    x2={xCoordinates[index]}
                    y1={CHART_MARGIN.top}
                    y2={height - CHART_MARGIN.bottom}
                    stroke="#475569"
                    strokeWidth="1.5"
                  />
                  <text
                    x={xCoordinates[index]}
                    y={height - CHART_MARGIN.bottom + 28}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="11"
                    fontWeight="900"
                    aria-label={statItem.label}
                  >
                    {statItem.shortLabel}
                  </text>
                </g>
              ))}

              {orderedPathRows.map((row) => {
                const isSelected =
                  selectedDetailEntryId === row.assignment.entryId;
                const hasSelection = selectedDetailEntryId != null;

                return (
                  <path
                    key={`${row.assignment.entryId}-${row.index}-path`}
                    d={row.path}
                    fill="none"
                    stroke={row.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={isSelected ? 4.25 : 1.45}
                    strokeOpacity={
                      isSelected ? 0.98 : hasSelection ? 0.08 : 0.34
                    }
                    pointerEvents="none"
                    aria-label={`${row.assignment.teamName}, Cluster ${row.assignment.clusterId}`}
                  />
                );
              })}

              {selectedDetailRow
                ? selectedDetailPoints.map((point) => (
                    <circle
                      key={`${selectedDetailRow.assignment.entryId}-${point.statKey}-selected-point`}
                      cx={point.x}
                      cy={point.y}
                      r={4.5}
                      fill={selectedDetailRow.color}
                      stroke="#020617"
                      strokeWidth={1.5}
                    />
                  ))
                : null}
            </svg>
          </div>

          <SelectedEntryDetailsPanel
            row={selectedDetailRow}
            statItems={statItems}
            onClearSelection={clearDetailEntry}
          />
        </div>
      </div>
    </div>
  );
});

const EntrySelectionList = memo(function EntrySelectionList({
  rows,
  searchValue,
  selectedEntryId,
  onSearchChange,
  onClearSearch,
  onSelect,
}: EntrySelectionListProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-white">
          Entries
        </p>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {rows.length}
        </span>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          type="search"
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search team, season, league..."
          className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
        />
        {searchValue.trim().length > 0 ? (
          <button
            type="button"
            onClick={onClearSearch}
            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
            No entries match the current filters.
          </p>
        ) : (
          rows.map((row) => {
            const isSelected = selectedEntryId === row.assignment.entryId;

            return (
              <button
                key={`${row.assignment.entryId}-${row.index}-entry-button`}
                type="button"
                onClick={() => onSelect(row.assignment.entryId)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-blue-500/40 bg-blue-500/10"
                    : "border-slate-800 bg-slate-950/45 hover:border-slate-700 hover:bg-slate-900/80"
                }`}
              >
                <span className="block truncate text-xs font-black uppercase tracking-widest text-white">
                  {row.assignment.teamName}
                </span>
                <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {getAssignmentSeasonLabel(row.assignment)}
                </span>
                <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {getAssignmentTournamentLabel(row.assignment)}
                </span>
                <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: getClusterColor(row.assignment.clusterId),
                    }}
                  />
                  Cluster {row.assignment.clusterId}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

const SelectedEntryDetailsPanel = memo(function SelectedEntryDetailsPanel({
  row,
  statItems,
  onClearSelection,
}: SelectedEntryDetailsPanelProps) {
  return (
    <div className="mt-4 min-h-[5.5rem] rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      {row ? (
        <>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-white">
                {row.assignment.teamName}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {getAssignmentSeasonLabel(row.assignment)}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {getAssignmentTournamentLabel(row.assignment)}
              </p>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Cluster {row.assignment.clusterId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100"
          >
            Clear selection
          </button>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-[minmax(0,1fr)_96px_112px] gap-3 bg-slate-950/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Statistic</span>
              <span className="text-right">Raw value</span>
              <span className="text-right">Normalized</span>
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {statItems.map((statItem) => {
                const point = row.pointsByStatKey[statItem.statKey];

                return (
                  <div
                    key={`${row.assignment.entryId}-${statItem.statKey}-detail`}
                    className="grid grid-cols-[minmax(0,1fr)_96px_112px] gap-3 border-t border-slate-800/70 px-3 py-2 text-xs"
                  >
                    <span className="truncate font-bold text-slate-300">
                      {statItem.label}
                    </span>
                    <span className="text-right font-black tabular-nums text-white">
                      {point?.rawDisplayValue ?? "—"}
                    </span>
                    <span className="text-right font-black tabular-nums text-blue-300">
                      {point?.normalizedDisplayValue ?? "0.000"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Select a team-season entry to inspect its raw and normalized values.
        </p>
      )}
    </div>
  );
});

const ClusterMembershipSummary = memo(function ClusterMembershipSummary({
  clusters,
}: ClusterMembershipSummaryProps) {
  const groupedMembership = useMemo(
    () =>
      clusters.map((cluster) => ({
        ...cluster,
        members: cluster.members
          .slice()
          .sort((left, right) =>
            safeCompareLabels(left.teamName, right.teamName) ||
            safeCompareLabels(
              getAssignmentSeasonLabel(left),
              getAssignmentSeasonLabel(right),
            ) ||
            safeCompareLabels(
              getAssignmentTournamentLabel(left),
              getAssignmentTournamentLabel(right),
            ),
          ),
      })),
    [clusters],
  );

  return (
    <div className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-5">
        <h5 className="text-sm font-black uppercase tracking-widest text-white">
          Cluster Membership Summary
        </h5>
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          Grouped team-season membership without per-stat values.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {groupedMembership.map((cluster) => (
          <div
            key={cluster.clusterId}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h6 className="text-xs font-black uppercase tracking-widest text-white">
                Cluster {cluster.clusterId}
              </h6>
              <span className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                {cluster.members.length} entries
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-3 bg-slate-950/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>Team</span>
                <span>Season</span>
                <span>Tournament</span>
              </div>
              <div className="max-h-[260px] overflow-y-auto">
                {cluster.members.map((assignment) => (
                  <div
                    key={`${cluster.clusterId}-${assignment.entryId}-membership`}
                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-3 border-t border-slate-800/70 px-3 py-2 text-xs"
                  >
                    <span className="truncate font-bold text-slate-200">
                      {assignment.teamName}
                    </span>
                    <span className="truncate font-bold text-slate-400">
                      {getAssignmentSeasonLabel(assignment)}
                    </span>
                    <span className="truncate font-bold text-slate-400">
                      {getAssignmentTournamentLabel(assignment)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const ClusterFilterControls = memo(function ClusterFilterControls({
  options,
  value,
  onChange,
}: ClusterFilterControlsProps) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={getClusterFilterButtonClass(value === "all")}
      >
        All clusters
      </button>
      {options.map((option) => (
        <button
          key={option.clusterId}
          type="button"
          onClick={() => onChange(option.clusterId)}
          className={getClusterFilterButtonClass(value === option.clusterId)}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getClusterColor(option.clusterId) }}
          />
          Cluster {option.clusterId}
        </button>
      ))}
    </div>
  );
});

function ElbowTooltip({
  active,
  payload,
  label,
}: ElbowTooltipProps) {
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

function buildClusterGroups(
  assignments: TeamClusterAssignment[],
  k: number,
) {
  const assignmentsByCluster = new Map<number, TeamClusterAssignment[]>();

  Array.from({ length: k }, (_, index) => index + 1).forEach((clusterId) => {
    assignmentsByCluster.set(clusterId, []);
  });

  assignments.forEach((assignment) => {
    const members = assignmentsByCluster.get(assignment.clusterId) ?? [];
    members.push(assignment);
    assignmentsByCluster.set(assignment.clusterId, members);
  });

  return Array.from(assignmentsByCluster.entries())
    .sort(([leftClusterId], [rightClusterId]) => leftClusterId - rightClusterId)
    .map(([clusterId, members]) => ({
      clusterId,
      members,
    }));
}

function buildClusterProfiles(
  assignments: TeamClusterAssignment[],
  statKeys: TeamStatKey[],
  k: number,
): ClusterProfile[] {
  return buildClusterGroups(assignments, k)
    .map(({ clusterId, members }) => {
      const averages = Object.fromEntries(
        statKeys.map((statKey) => {
          const total = members.reduce(
            (sum, assignment) =>
              sum + getNormalizedDisplayValue(assignment.normalizedStats?.[statKey]),
            0,
          );
          const average = members.length > 0 ? total / members.length : 0;

          return [statKey, Number(clamp01(average).toFixed(6))];
        }),
      ) as Partial<Record<TeamStatKey, number>>;
      const { strongest, weakest } = getClusterInsightStats(averages, statKeys);

      return {
        clusterId,
        members,
        averages,
        strongest,
        weakest,
      };
    });
}

function getClusterInsightStats(
  averages: Partial<Record<TeamStatKey, number>>,
  statKeys: TeamStatKey[],
) {
  const rankedStats = statKeys.map((statKey, index) => ({
    statKey,
    label: getSafeStatLabel(statKey),
    value: getNormalizedDisplayValue(averages[statKey]),
    index,
  }));
  const strongest = rankedStats
    .slice()
    .sort((left, right) => right.value - left.value || left.index - right.index)
    .slice(0, Math.min(2, rankedStats.length));
  const strongestKeys = new Set(strongest.map((stat) => stat.statKey));
  const weakest = rankedStats
    .filter((stat) => !strongestKeys.has(stat.statKey))
    .sort((left, right) => left.value - right.value || left.index - right.index)
    .slice(0, Math.min(2, Math.max(0, rankedStats.length - strongest.length)));

  return {
    strongest: strongest.map((stat) => ({
      statKey: stat.statKey,
      label: stat.label,
      value: stat.value,
    })),
    weakest: weakest.map((stat) => ({
      statKey: stat.statKey,
      label: stat.label,
      value: stat.value,
    })),
  };
}

function formatInsightLabels(stats: ClusterInsightStat[]) {
  if (stats.length === 0) {
    return "—";
  }

  return stats.map((stat) => stat.label).join(", ");
}

function getClusterFilterOptions(result: TeamClusterRunPayload): ClusterLegendItem[] {
  return Array.from({ length: result.k }, (_, index) => ({
    clusterId: index + 1,
  })).sort((left, right) => left.clusterId - right.clusterId);
}

function getClusterFilterButtonClass(isActive: boolean) {
  const baseClass =
    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors";

  return isActive
    ? `${baseClass} border-blue-500/30 bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.25)]`
    : `${baseClass} border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100`;
}

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

function getAssignmentSeasonLabel(assignment: TeamClusterAssignment) {
  return assignment.seasonName || `Season ${assignment.seasonId}`;
}

function getAssignmentTournamentLabel(assignment: TeamClusterAssignment) {
  return assignment.tournamentName ?? "Unknown league";
}

function getAssignmentSearchText(assignment: TeamClusterAssignment) {
  return [
    assignment.teamName,
    getAssignmentSeasonLabel(assignment),
    getAssignmentTournamentLabel(assignment),
    `Cluster ${assignment.clusterId}`,
  ]
    .join(" ")
    .toLowerCase();
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

function getNormalizedDisplayValue(value: number | null | undefined) {
  return clamp01(Number(value ?? 0));
}

function formatDisplayRawStatValue(
  value: number | null | undefined,
  statKey: TeamStatKey,
) {
  return value == null ? "—" : formatRawStatValue(value, statKey);
}

function truncateLabel(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}...`
    : value;
}

function buildStatDisplayItems(statKeys: TeamStatKey[]): StatDisplayItem[] {
  return statKeys.map((statKey) => {
    const label = getSafeStatLabel(statKey);

    return {
      statKey,
      label,
      shortLabel: truncateLabel(label, 14),
    };
  });
}

function getChartWidth(statCount: number) {
  return Math.max(MIN_CHART_WIDTH, statCount * STAT_AXIS_WIDTH);
}

function buildXCoordinates(statCount: number, plotWidth: number) {
  return Array.from(
    { length: statCount },
    (_, index) =>
      CHART_MARGIN.left + (plotWidth * index) / Math.max(1, statCount - 1),
  );
}

function formatNormalizedStatValue(value: number | null | undefined) {
  return clamp01(Number(value ?? 0)).toFixed(3);
}

function safeCompareLabels(left: string | null | undefined, right: string | null | undefined) {
  return String(left ?? "").localeCompare(String(right ?? ""));
}
