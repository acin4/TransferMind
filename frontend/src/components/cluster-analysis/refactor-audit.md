# ClusterAnalysisTab Refactor Audit

Audited file: `frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx`

Scope: map current structure before extraction. Do not change runtime behavior, UI, API calls, clustering logic, normalization, selected team/stat behavior, or chart rendering.

## Local Constants

Top-level constants:

- `CLUSTER_COLORS`
- `CHART_Y_TICKS`
- `CHART_MARGIN`
- `CLUSTER_AVERAGE_CHART_HEIGHT`
- `PARALLEL_COORDINATES_CHART_HEIGHT`
- `MIN_CHART_WIDTH`
- `STAT_AXIS_WIDTH`

`ClusterAnalysisTab` state constants:

- `selectedEntryIds`, `setSelectedEntryIds`
- `selectedStatKeys`, `setSelectedStatKeys`
- `selectedCountryFilter`, `setSelectedCountryFilter`
- `selectedStatCategory`, `setSelectedStatCategory`
- `maxK`, `setMaxK`
- `selectedK`, `setSelectedK`
- `elbowResult`, `setElbowResult`
- `clusterResult`, `setClusterResult`
- `loadingElbow`, `setLoadingElbow`
- `loadingClusters`, `setLoadingClusters`
- `requestError`, `setRequestError`

`ClusterAnalysisTab` derived constants:

- `clusterEntries`
- `entryOptions`
- `countryFilteredEntryOptions`
- `entriesById`
- `selectedEntries`
- `selectedTeamSeasonEntries`
- `maxAllowedK`
- `availableStatKeys`
- `availableStatKeySet`
- `cleanedSelectedStatKeys`
- `statOptions`
- `categoryFilteredStatOptions`
- `validationMessage`
- `kOptions`
- `clusterAssignments`
- `clusterK`
- `clusters`
- `clusterProfiles`

`ClusterAnalysisTab` local callback/callback-local constants:

- `availableEntryIds`
- `toggleEntry`
- `toggleStat`
- `typedStatKey`
- `selectVisibleStats`
- `visibleTypedStatKeys`
- `clearVisibleStats`
- `visibleStatKeySet`
- `selectVisibleEntries`
- `clearVisibleEntries`
- `visibleEntryIdSet`
- `buildRequestPayload`
- `handleCalculateElbow`
- `payload`
- `result`
- `handleRunClusters`
- inline Max K option `value`

Component-local constants in child components:

- `MessageBox`: `toneClass`
- `ClusterAverageProfilesChart`: `selectedAverageClusterId`, `setSelectedAverageClusterId`, `statItems`, `width`, `height`, `plotWidth`, `plotHeight`, `xCoordinates`, `svgStyle`, `getY`, `chartRows`, `sortedProfiles`, `selectedAverageProfile`, `selectedAverageRow`, `selectAverageCluster`, `clearAverageCluster`, per-row `color`, `points`, `value`, `isSelected`, `hasSelection`
- `ParallelCoordinatesPlot`: `selectedClusterFilter`, `setSelectedClusterFilter`, `selectedDetailEntryId`, `setSelectedDetailEntryId`, `entrySearch`, `setEntrySearch`, `statItems`, `width`, `height`, `plotWidth`, `plotHeight`, `clusterFilters`, `xCoordinates`, `svgStyle`, `getY`, `allPathRows`, `clusterFilteredPathRows`, `normalizedEntrySearch`, `searchedEntryRows`, `selectedDetailRow`, `orderedPathRows`, `selectedDetailPoints`, `renderedPathCount`, `assignmentCount`, `hasVisibleRows`, `selectDetailEntry`, `clearDetailEntry`, `handleEntrySearchChange`, `clearEntrySearch`, `selectClusterFilter`, effect-local `availableClusterIds`, per-row `color`, `points`, `rawValue`, `normalizedValue`, `isSelected`, `hasSelection`
- `EntrySelectionList`: per-row `isSelected`
- `SelectedEntryDetailsPanel`: per-stat `point`
- `ClusterMembershipSummary`: `groupedMembership`
- `ElbowTooltip`: `point`

Helper-local constants:

- `buildClusterGroups`: `assignmentsByCluster`, `members`
- `buildClusterProfiles`: `averages`, `total`, `average`, `strongest`, `weakest`
- `getClusterInsightStats`: `rankedStats`, `strongest`, `strongestKeys`, `weakest`
- `getClusterFilterButtonClass`: `baseClass`
- `sanitizeSelectedStatKeys`: `cleanedStatKeys`
- `buildStatDisplayItems`: `label`

## Local TypeScript Types

Declared local types:

- `ClusterAnalysisTabProps`
- `ClusterProfile`
- `ClusterInsightStat`
- `ClusterLegendItem`
- `ClusterFilterValue`
- `StatDisplayItem`
- `ParallelCoordinatesPoint`
- `ParallelCoordinatesPathRow`
- `ClusterTeamSeasonEntry`

Inline component prop types:

- `SelectField` props
- `MessageBox` props
- `ClusterAverageProfilesChart` props
- `ClusterLegend` props
- `ClusterSelectionControls` props
- `ClusterAverageDetailsPanel` props
- `ParallelCoordinatesPlot` props
- `EntrySelectionList` props
- `SelectedEntryDetailsPanel` props
- `ClusterMembershipSummary` props
- `ClusterFilterControls` props
- `ElbowTooltip` props

Imported types used by this file:

- `ChangeEvent`
- `TeamClusterAssignment`
- `TeamClusterEntryRequest`
- `TeamClusterElbowPayload`
- `TeamClusterElbowPoint`
- `TeamClusterRunPayload`
- `TeamSeasonStatEntry`
- `TeamStatKey`
- `StatCategoryFilterId`
- `CountryFilterTab`

## Internal React Components

- `ClusterAnalysisTab`: page/tab orchestrator, owns input selection state, API request state, reset effects, and renders the main sections.
- `SelectField`: shared select wrapper for Max K and Final K.
- `MessageBox`: error/warning message list.
- `ClusterAverageProfilesChart`: SVG chart for cluster average normalized profiles. Owns selected average cluster state.
- `ClusterLegend`: cluster color legend.
- `ClusterSelectionControls`: buttons for selecting one average-profile cluster.
- `ClusterAverageDetailsPanel`: selected cluster average details.
- `ParallelCoordinatesPlot`: SVG parallel coordinates chart plus entry filter/search/detail state.
- `EntrySelectionList`: searchable entry list for the parallel coordinates plot.
- `SelectedEntryDetailsPanel`: selected team-season raw/normalized values.
- `ClusterMembershipSummary`: grouped cluster membership table.
- `ClusterFilterControls`: all-cluster/single-cluster filter buttons.
- `ElbowTooltip`: Recharts tooltip for elbow points.

## Pure Helper Functions

Safe to extract once their dependent types/imports move with them:

- `buildClusterGroups`
- `buildClusterProfiles`
- `getClusterInsightStats`
- `getClusterFilterOptions`
- `getClusterFilterButtonClass`
- `hasClusterEntryIds`
- `sanitizeSelectedStatKeys`
- `areStatKeyArraysEqual`
- `getErrorMessage`
- `getSafeStatLabel`
- `getAssignmentSeasonLabel`
- `getAssignmentTournamentLabel`
- `getAssignmentSearchText`
- `getClusterColor`
- `clamp01`
- `getNormalizedDisplayValue`
- `truncateLabel`
- `buildStatDisplayItems`
- `safeCompareLabels`

## Formatter Functions

- `formatInsightLabels`
- `getSafeStatLabel`
- `getAssignmentSeasonLabel`
- `getAssignmentTournamentLabel`
- `formatDisplayRawStatValue`
- `formatNormalizedStatValue`
- `truncateLabel`
- `safeCompareLabels`
- `getErrorMessage`

## Chart Math/Helper Functions

- `getClusterColor`
- `clamp01`
- `getNormalizedDisplayValue`
- `buildStatDisplayItems`
- `getChartWidth`
- `buildXCoordinates`
- Component-local `getY` in `ClusterAverageProfilesChart`
- Component-local `getY` in `ParallelCoordinatesPlot`
- Path construction inside `ClusterAverageProfilesChart.chartRows`
- Path construction and `pointsByStatKey` construction inside `ParallelCoordinatesPlot.allPathRows`

`getY` and path builders are pure in practice, but currently close over component-local dimensions, x coordinates, and selected stat item arrays. Extract them only after the chart data model is named and covered by a no-behavior-change snapshot or type-check pass.

## Do Not Move Yet

Keep these in `ClusterAnalysisTab` until the first extraction proves imports and behavior are stable:

- Selection state and reset effects: `selectedEntryIds`, `selectedStatKeys`, country/category filters, `maxK`, `selectedK`, `elbowResult`, `clusterResult`, loading/error state, and all effects that prune or reset them.
- Input mutation callbacks: `toggleEntry`, `toggleStat`, `selectVisibleStats`, `clearVisibleStats`, `selectVisibleEntries`, `clearVisibleEntries`.
- API request callbacks: `buildRequestPayload`, `handleCalculateElbow`, `handleRunClusters`.
- Derived request/view state tied to those effects: `selectedEntries`, `selectedTeamSeasonEntries`, `maxAllowedK`, `validationMessage`, `kOptions`.

Keep these inside their current chart components during the first pass:

- `ClusterAverageProfilesChart` state/effect/callbacks: `selectedAverageClusterId`, `selectAverageCluster`, `clearAverageCluster`, selected-cluster cleanup effect, `selectedAverageProfile`, `selectedAverageRow`.
- `ParallelCoordinatesPlot` state/effect/callbacks: `selectedClusterFilter`, `selectedDetailEntryId`, `entrySearch`, `selectDetailEntry`, `clearDetailEntry`, `handleEntrySearchChange`, `clearEntrySearch`, `selectClusterFilter`, cluster-filter cleanup effect, selected-entry cleanup effect.
- Chart row assembly in both chart components until extracted helper signatures are explicit.

## Safest Extraction Order

1. Extract type declarations and top-level constants to colocated files under `frontend/src/components/cluster-analysis/`, keeping names unchanged.
2. Extract pure non-React helpers that do not depend on chart dimensions: grouping, profile, labels, sorting, colors, stat-key sanitation, and formatting helpers.
3. Extract chart math helpers after pure helpers: `getChartWidth`, `buildXCoordinates`, and eventually named builders for average-profile rows and parallel-coordinate rows.
4. Extract small stateless UI components: `SelectField`, `MessageBox`, `ClusterLegend`, `ClusterFilterControls`, `ClusterSelectionControls`.
5. Extract detail/list panels: `ClusterAverageDetailsPanel`, `EntrySelectionList`, `SelectedEntryDetailsPanel`, `ClusterMembershipSummary`.
6. Extract chart containers last: `ClusterAverageProfilesChart` and `ParallelCoordinatesPlot`, preserving their local state/effects during the move.
7. Leave `ClusterAnalysisTab` as the orchestrator for selection state, API calls, validation, reset effects, and section composition until a later behavior-preserving pass.

Verification after each extraction step: run TypeScript/build or at least frontend lint/build when practical, and check that no import introduces frontend Supabase access or external `api_id` leakage.
