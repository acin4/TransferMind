import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  calculateTeamClusterElbow,
  runTeamClusters,
  type TeamClusterEntryRequest,
  type TeamClusterElbowPayload,
  type TeamClusterRunPayload,
} from "../../api/api";
import type { TeamStatKey } from "../../teamStatsConfig";
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
  ClusterAverageProfilesChart,
  ElbowMethodPanel,
  MessageBox,
  ParallelCoordinatesPlot,
  SelectField,
} from "../cluster-analysis/components";
import {
  areStatKeyArraysEqual,
  buildClusterGroups,
  buildClusterProfiles,
  hasClusterEntryIds,
  sanitizeSelectedStatKeys,
} from "../cluster-analysis/utils/clusterAnalysisUtils";
import {
  getAssignmentSeasonLabel,
  getAssignmentTournamentLabel,
  getErrorMessage,
  getSafeStatLabel,
  safeCompareLabels,
} from "../cluster-analysis/utils/clusterFormatters";
import type {
  ClusterAnalysisTabProps,
  ClusterTeamSeasonEntry,
  ClusterMembershipSummaryProps,
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
        <ElbowMethodPanel
          elbowResult={elbowResult}
          selectedK={selectedK}
          kOptions={kOptions}
          loadingClusters={loadingClusters}
          onSelectedKChange={setSelectedK}
          onRunClusters={handleRunClusters}
        />
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
