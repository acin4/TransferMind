import { useMemo } from "react";
import {
  AgglomerativeResultsPanel,
  ClusterAverageProfilesChart,
  ClusterMembershipSummary,
  ClusterSetupPanel,
  ElbowMethodPanel,
  MessageBox,
  ParallelCoordinatesPlot,
} from "../cluster-analysis/components";
import { useClusterProfiles } from "../cluster-analysis/hooks/useClusterProfiles";
import { useClusterRequests } from "../cluster-analysis/hooks/useClusterRequests";
import { useClusterSelectionState } from "../cluster-analysis/hooks/useClusterSelectionState";
import { useClusterSetupData } from "../cluster-analysis/hooks/useClusterSetupData";
import { useClusterSetupMaintenanceEffects } from "../cluster-analysis/hooks/useClusterSetupMaintenanceEffects";
import type { ClusterAnalysisTabProps } from "../cluster-analysis/types";
import {
  buildClusterGroups,
  buildClusterProfiles,
} from "../cluster-analysis/utils/clusterAnalysisUtils";
import { ContentPanel } from "../ui/design";

const AGGLOMERATIVE_LINKAGE_OPTIONS = [
  { value: "ward" as const, label: "Ward" },
  { value: "complete" as const, label: "Complete" },
  { value: "average" as const, label: "Average" },
  { value: "single" as const, label: "Single" },
];

// ClusterAnalysisTab is the Cluster Analysis view inside Teams Comparison.
// It connects the raw team-season entries and supported stat keys to the reusable
// cluster-analysis hooks/components that handle setup, API requests, and charts.
export default function ClusterAnalysisTab({
  // entries are the team-season rows that can be selected for clustering.
  entries,
  // supportedStatKeys are the statistics that this dataset can use as columns.
  statKeys: supportedStatKeys,
}: ClusterAnalysisTabProps) {
  // This hook owns the user's setup selections:
  // selected entries, selected stats, filters, Max K, and toggle/select handlers.
  const {
    selectedAlgorithm,
    setSelectedAlgorithm,
    selectedEntryIds,
    setSelectedEntryIds,
    selectedStatKeys,
    setSelectedStatKeys,
    selectedCountryFilter,
    setSelectedCountryFilter,
    selectedStatCategory,
    setSelectedStatCategory,
    maxK,
    setMaxK,
    agglomerativeK,
    setAgglomerativeK,
    agglomerativeLinkage,
    toggleEntry,
    toggleStat,
    selectVisibleEntries,
    clearVisibleEntries,
    selectVisibleStats,
    clearVisibleStats,
    handleMaxKChange,
    handleAgglomerativeKChange,
    handleAgglomerativeLinkageChange,
  } = useClusterSelectionState({ statKeys: supportedStatKeys });

  // This hook converts raw entries/selections into UI-ready setup data:
  // checkbox options, filtered visible options, selected request entries,
  // validated stat keys, Max K options, and validation text.
  const {
    clusterEntries,
    entryOptions,
    countryFilteredEntryOptions,
    selectedEntries,
    selectedTeamSeasonEntries,
    maxAllowedK,
    cleanedSelectedStatKeys,
    statOptions,
    categoryFilteredStatOptions,
    validationMessage,
    maxKOptions,
  } = useClusterSetupData({
    entries,
    statKeys: supportedStatKeys,
    selectedEntryIds,
    selectedStatKeys,
    countryFilter: selectedCountryFilter,
    statCategoryFilter: selectedStatCategory,
  });

  // Maintenance effects keep selection state valid when available entries/stats
  // change. For example, it removes selected ids that no longer exist and clamps
  // Max K to the current allowed range.
  useClusterSetupMaintenanceEffects({
    clusterEntries,
    cleanedSelectedStatKeys,
    maxAllowedK,
    setSelectedEntryIds,
    selectedStatKeys,
    setSelectedStatKeys,
    setMaxK,
    setAgglomerativeK,
  });

  // This hook owns the two backend request flows:
  // 1. calculate the elbow curve
  // 2. run k-means with the chosen final K
  const {
    selectedK,
    setSelectedK,
    elbowResult,
    clusterResult,
    agglomerativeResult,
    loadingElbow,
    loadingClusters,
    loadingAgglomerative,
    requestError,
    handleCalculateElbow,
    handleRunClusters,
    handleRunAgglomerative,
    kOptions,
  } = useClusterRequests({
    requestPayloadEntries: selectedTeamSeasonEntries,
    cleanedSelectedStatKeys,
    maxK,
    selectedAlgorithm,
    agglomerativeK,
    agglomerativeLinkage,
    selectedEntryIds,
    validationMessage,
  });
  // This hook reshapes the cluster run result into grouped clusters and average
  // profiles for the summary/detail charts.
  const { clusters, clusterProfiles } = useClusterProfiles(
    clusterResult,
    cleanedSelectedStatKeys,
  );
  const selectedAgglomerativeEntryKeys = useMemo(
    () =>
      new Set(
        selectedTeamSeasonEntries.map(
          (entry) =>
            `${entry.teamId}:${entry.tournamentId}:${entry.seasonId}`,
        ),
      ),
    [selectedTeamSeasonEntries],
  );
  const freshAgglomerativeResult = useMemo(() => {
    if (
      !agglomerativeResult ||
      agglomerativeResult.k !== agglomerativeK ||
      agglomerativeResult.linkage !== agglomerativeLinkage ||
      agglomerativeResult.assignments.length !==
        selectedAgglomerativeEntryKeys.size ||
      agglomerativeResult.stats.length !== cleanedSelectedStatKeys.length
    ) {
      return null;
    }

    const hasCurrentEntries = agglomerativeResult.assignments.every(
      (assignment) => selectedAgglomerativeEntryKeys.has(assignment.entryId),
    );
    const hasCurrentStats = cleanedSelectedStatKeys.every(
      (statKey, index) => agglomerativeResult.stats[index]?.key === statKey,
    );

    return hasCurrentEntries && hasCurrentStats ? agglomerativeResult : null;
  }, [
    agglomerativeK,
    agglomerativeLinkage,
    agglomerativeResult,
    cleanedSelectedStatKeys,
    selectedAgglomerativeEntryKeys,
  ]);
  const agglomerativeClusters = useMemo(
    () =>
      freshAgglomerativeResult
        ? buildClusterGroups(
            freshAgglomerativeResult.assignments,
            freshAgglomerativeResult.k,
          )
        : [],
    [freshAgglomerativeResult],
  );
  const agglomerativeStatKeys = useMemo(
    () =>
      freshAgglomerativeResult
        ? freshAgglomerativeResult.stats.map((stat) => stat.key)
        : [],
    [freshAgglomerativeResult],
  );
  const agglomerativeProfiles = useMemo(
    () =>
      freshAgglomerativeResult
        ? buildClusterProfiles(
            freshAgglomerativeResult.assignments,
            agglomerativeStatKeys,
            freshAgglomerativeResult.k,
          )
        : [],
    [agglomerativeStatKeys, freshAgglomerativeResult],
  );

  return (
    // Vertical spacing separates the setup panel, elbow panel, and final results.
    <div className="space-y-6">
      {/* Setup panel is the main form: choose team-season rows, stat columns, and
          Max K, then start the elbow calculation. */}
      <ClusterSetupPanel
        selectedAlgorithm={selectedAlgorithm}
        maxK={maxK}
        maxKOptions={maxKOptions}
        agglomerativeK={agglomerativeK}
        agglomerativeKOptions={maxKOptions}
        agglomerativeLinkage={agglomerativeLinkage}
        linkageOptions={AGGLOMERATIVE_LINKAGE_OPTIONS}
        matrixRowCount={selectedEntries.length}
        matrixColumnCount={cleanedSelectedStatKeys.length}
        entryOptions={entryOptions}
        countryFilteredEntryOptions={countryFilteredEntryOptions}
        selectedEntryIds={selectedEntryIds}
        selectedCountryFilter={selectedCountryFilter}
        statOptions={statOptions}
        categoryFilteredStatOptions={categoryFilteredStatOptions}
        selectedStatKeys={cleanedSelectedStatKeys}
        selectedStatCategory={selectedStatCategory}
        validationMessage={validationMessage}
        loadingElbow={loadingElbow}
        loadingAgglomerative={loadingAgglomerative}
        requestError={requestError}
        onAlgorithmChange={setSelectedAlgorithm}
        onMaxKChange={handleMaxKChange}
        onAgglomerativeKChange={handleAgglomerativeKChange}
        onAgglomerativeLinkageChange={handleAgglomerativeLinkageChange}
        onEntryToggle={toggleEntry}
        onSelectVisibleEntries={selectVisibleEntries}
        onClearVisibleEntries={clearVisibleEntries}
        onCountryFilterChange={setSelectedCountryFilter}
        onStatToggle={toggleStat}
        onSelectVisibleStats={selectVisibleStats}
        onClearVisibleStats={clearVisibleStats}
        onStatCategoryChange={setSelectedStatCategory}
        onCalculateElbow={handleCalculateElbow}
        onRunAgglomerative={handleRunAgglomerative}
      />

      {/* Show the elbow panel only after the elbow request has returned data. */}
      {selectedAlgorithm === "kmeans" && elbowResult ? (
        <ElbowMethodPanel
          elbowResult={elbowResult}
          selectedK={selectedK}
          kOptions={kOptions}
          loadingClusters={loadingClusters}
          onSelectedKChange={setSelectedK}
          onRunClusters={handleRunClusters}
        />
      ) : null}

      {/* Show final cluster visualizations only after k-means has successfully run. */}
      {selectedAlgorithm === "kmeans" && clusterResult ? (
        <ContentPanel>
          {/* Results header explains that clustering used normalized values, while
              raw values are still available for human interpretation. */}
          <div className="mb-6">
            <h4 className="text-lg font-black uppercase tracking-tight text-white">
              Clustered Entries
            </h4>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
              Final K-Means used normalized 0-1 values only, direction-adjusted
              so higher normalized values mean better performance. Raw values
              are displayed for interpretation.
            </p>
          </div>

          {/* Backend warnings are shown above the charts so users see limitations
              before interpreting the result. */}
          {clusterResult.warnings.length > 0 ? (
            <MessageBox tone="warning" messages={clusterResult.warnings} />
          ) : null}

          {/* Average profile chart compares cluster-level normalized stat averages. */}
          <ClusterAverageProfilesChart
            profiles={clusterProfiles}
            resetAssignments={clusterResult.assignments}
            statKeys={cleanedSelectedStatKeys}
          />

          {/* Parallel coordinates plot shows individual clustered entries across
              the selected stat columns. */}
          <ParallelCoordinatesPlot
            result={clusterResult}
          />

          {/* Membership summary lists which team-season entries belong to each cluster. */}
          <ClusterMembershipSummary clusters={clusters} />
        </ContentPanel>
      ) : null}

      {selectedAlgorithm === "agglomerative" && freshAgglomerativeResult ? (
        <AgglomerativeResultsPanel
          result={freshAgglomerativeResult}
          clusters={agglomerativeClusters}
          profiles={agglomerativeProfiles}
        />
      ) : null}
    </div>
  );
}
