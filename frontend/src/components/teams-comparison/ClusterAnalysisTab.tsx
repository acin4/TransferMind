import {
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
import { ContentPanel } from "../ui/design";

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
    toggleEntry,
    toggleStat,
    selectVisibleEntries,
    clearVisibleEntries,
    selectVisibleStats,
    clearVisibleStats,
    handleMaxKChange,
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
  });

  // This hook owns the two backend request flows:
  // 1. calculate the elbow curve
  // 2. run k-means with the chosen final K
  const {
    selectedK,
    setSelectedK,
    elbowResult,
    clusterResult,
    loadingElbow,
    loadingClusters,
    requestError,
    handleCalculateElbow,
    handleRunClusters,
    kOptions,
  } = useClusterRequests({
    requestPayloadEntries: selectedTeamSeasonEntries,
    cleanedSelectedStatKeys,
    maxK,
    selectedEntryIds,
    validationMessage,
  });
  // This hook reshapes the cluster run result into grouped clusters and average
  // profiles for the summary/detail charts.
  const { clusters, clusterProfiles } = useClusterProfiles(
    clusterResult,
    cleanedSelectedStatKeys,
  );

  return (
    // Vertical spacing separates the setup panel, elbow panel, and final results.
    <div className="space-y-6">
      {/* Setup panel is the main form: choose team-season rows, stat columns, and
          Max K, then start the elbow calculation. */}
      <ClusterSetupPanel
        maxK={maxK}
        maxKOptions={maxKOptions}
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
        requestError={requestError}
        onMaxKChange={handleMaxKChange}
        onEntryToggle={toggleEntry}
        onSelectVisibleEntries={selectVisibleEntries}
        onClearVisibleEntries={clearVisibleEntries}
        onCountryFilterChange={setSelectedCountryFilter}
        onStatToggle={toggleStat}
        onSelectVisibleStats={selectVisibleStats}
        onClearVisibleStats={clearVisibleStats}
        onStatCategoryChange={setSelectedStatCategory}
        onCalculateElbow={handleCalculateElbow}
      />

      {/* Show the elbow panel only after the elbow request has returned data. */}
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

      {/* Show final cluster visualizations only after k-means has successfully run. */}
      {clusterResult ? (
        <ContentPanel>
          {/* Results header explains that clustering used normalized values, while
              raw values are still available for human interpretation. */}
          <div className="mb-6">
            <h4 className="text-lg font-black uppercase tracking-tight text-white">
              Clustered Entries
            </h4>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mt-3">
              Final K-Means used normalized 0-1 values only. Raw values are
              displayed for interpretation.
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
            statKeys={cleanedSelectedStatKeys}
          />

          {/* Membership summary lists which team-season entries belong to each cluster. */}
          <ClusterMembershipSummary clusters={clusters} />
        </ContentPanel>
      ) : null}
    </div>
  );
}
