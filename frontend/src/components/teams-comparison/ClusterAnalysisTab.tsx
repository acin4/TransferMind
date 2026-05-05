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

export default function ClusterAnalysisTab({
  entries,
  statKeys: supportedStatKeys,
}: ClusterAnalysisTabProps) {
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

  useClusterSetupMaintenanceEffects({
    clusterEntries,
    cleanedSelectedStatKeys,
    maxAllowedK,
    selectedEntryIds,
    setSelectedEntryIds,
    selectedStatKeys,
    setSelectedStatKeys,
    maxK,
    setMaxK,
  });

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
  const { clusters, clusterProfiles } = useClusterProfiles(
    clusterResult,
    cleanedSelectedStatKeys,
  );

  return (
    <div className="space-y-6">
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
