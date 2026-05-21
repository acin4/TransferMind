# Cluster Analysis State Extraction Audit

Scope: audit `frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx` before extracting state into hooks. This is documentation only; no runtime behavior, API payload shape, validation, reset behavior, filtering, clustering, normalization, markup, or styling should change.

## State Values

### `selectedEntryIds`
- Initial value: `[]`
- Setter: `setSelectedEntryIds`
- Read by:
  - `selectedEntries` memo maps selected ids to `ClusterTeamSeasonEntry` records.
  - Reset effect for `elbowResult`, `clusterResult`, `selectedK`, and `requestError`.
  - `ClusterSetupPanel.selectedEntryIds`
  - `toggleEntry`, `selectVisibleEntries`, `clearVisibleEntries`
- Updated by:
  - Entry pruning effect when `clusterEntries` changes.
  - `toggleEntry(entryId)`
  - `selectVisibleEntries(visibleEntryIds)`
  - `clearVisibleEntries(visibleEntryIds)`
- Affects:
  - API payloads through `selectedEntries` -> `selectedTeamSeasonEntries`.
  - UI rendering through selected checkbox state and matrix row count.
  - Validation through `selectedEntries.length`.
  - Chart rendering indirectly because changing it resets existing elbow/cluster results.

### `selectedStatKeys`
- Initial value: `[]`
- Setter: `setSelectedStatKeys`
- Read by:
  - `cleanedSelectedStatKeys` memo.
  - Stat cleanup effect compares raw and cleaned arrays.
  - `toggleStat`, `selectVisibleStats`, `clearVisibleStats`
- Updated by:
  - Stat cleanup effect when cleaned keys differ.
  - `toggleStat(statKey)`
  - `selectVisibleStats(visibleStatKeys)`
  - `clearVisibleStats(visibleStatKeys)`
- Affects:
  - API payloads through `cleanedSelectedStatKeys`.
  - UI rendering through cleaned selected statistic checkbox state and matrix column count.
  - Validation through `cleanedSelectedStatKeys.length`.
  - Chart rendering through `ClusterAverageProfilesChart`, `ParallelCoordinatesPlot`, and `useClusterProfiles`.

### `selectedCountryFilter`
- Initial value: `ALL_COUNTRIES_TAB`
- Setter: `setSelectedCountryFilter`
- Read by:
  - `countryFilteredEntryOptions` memo.
  - `ClusterSetupPanel.selectedCountryFilter`
- Updated by:
  - `ClusterSetupPanel.onCountryFilterChange`
- Affects:
  - UI rendering only: filters visible team-season options.
  - Does not directly affect API payloads, validation, reset effects, or chart rendering.
  - ALL/CLEAR behavior operates on the currently visible filtered entries supplied to `SearchableCheckboxPanel`.

### `selectedStatCategory`
- Initial value: `ALL_STAT_CATEGORIES`
- Setter: `setSelectedStatCategory`
- Read by:
  - `categoryFilteredStatOptions` memo.
  - `ClusterSetupPanel.selectedStatCategory`
- Updated by:
  - `ClusterSetupPanel.onStatCategoryChange`
- Affects:
  - UI rendering only: filters visible statistic options.
  - Does not directly affect API payloads, validation, reset effects, or chart rendering.
  - ALL/CLEAR behavior operates on the currently visible filtered stats supplied to `SearchableCheckboxPanel`.

### `maxK`
- Initial value: `8`
- Setter: `setMaxK`
- Read by:
  - Reset effect for `elbowResult`, `clusterResult`, `selectedK`, and `requestError`.
  - `handleCalculateElbow`
  - `ClusterSetupPanel.maxK`
- Updated by:
  - Max-K clamp effect, which sets it to `maxAllowedK`.
  - `ClusterSetupPanel.onMaxKChange`, currently inline: `(value) => setMaxK(Number(value))`
- Affects:
  - Elbow API payload as `maxK`.
  - UI rendering through the Max K select.
  - Reset behavior: changing `maxK` clears elbow/cluster results, selected K, and request error.
  - Does not directly affect validation.

### `selectedK`
- Initial value: `null`
- Setter: `setSelectedK`
- Read by:
  - `handleRunClusters`
  - `ElbowMethodPanel.selectedK`
  - Selected-K reset effect dependency.
- Updated by:
  - Setup reset effect sets it to `null` when selected teams/stats/maxK change.
  - `handleCalculateElbow` sets it to `result.suggestedK ?? Math.min(2, result.maxK)`.
  - `ElbowMethodPanel.onSelectedKChange`
- Affects:
  - Cluster run API payload as `k: selectedK`.
  - UI rendering in the Final K select and Run K-Means button disabled state.
  - Validation-like guard in `handleRunClusters`: if `selectedK == null`, writes request error.
  - Reset behavior: changing it clears `clusterResult`.
  - Chart rendering indirectly because changing it clears existing cluster charts.

### `elbowResult`
- Initial value: `null`
- Setter: `setElbowResult`
- Read by:
  - Conditional render for `ElbowMethodPanel`.
  - `kOptions` memo.
- Updated by:
  - Setup reset effect sets it to `null`.
  - `handleCalculateElbow` sets it to API result on success.
  - `handleCalculateElbow` catch sets it to `null`.
- Affects:
  - UI rendering of the elbow section and elbow warnings/chart.
  - K option derivation.
  - Does not directly affect API payloads except by enabling the selected-K UI flow.

### `clusterResult`
- Initial value: `null`
- Setter: `setClusterResult`
- Read by:
  - `useClusterProfiles(clusterResult, cleanedSelectedStatKeys)`
  - Conditional render for the clustered entries section.
  - Cluster result warnings.
  - `ParallelCoordinatesPlot.result`
- Updated by:
  - Setup reset effect sets it to `null`.
  - Selected-K reset effect sets it to `null`.
  - `handleCalculateElbow` clears it before fetching new elbow data.
  - `handleRunClusters` sets it to API result on success.
  - `handleRunClusters` catch sets it to `null`.
- Affects:
  - Chart rendering for average profiles, parallel coordinates, and membership summary.
  - UI rendering of clustered entries section and warnings.
  - Does not affect validation or request payload construction.

### `loadingElbow`
- Initial value: `false`
- Setter: `setLoadingElbow`
- Read by:
  - `ClusterSetupPanel.loadingElbow`
- Updated by:
  - `handleCalculateElbow` sets `true` before the elbow request and `false` in `finally`.
- Affects:
  - UI rendering of Calculate Elbow button text and disabled state.
  - Does not affect API payloads, validation logic, or chart rendering.

### `loadingClusters`
- Initial value: `false`
- Setter: `setLoadingClusters`
- Read by:
  - `ElbowMethodPanel.loadingClusters`
- Updated by:
  - `handleRunClusters` sets `true` before the cluster request and `false` in `finally`.
- Affects:
  - UI rendering of Run K-Means button text and disabled state.
  - Does not affect API payloads, validation logic, or chart rendering.

### `requestError`
- Initial value: `null`
- Setter: `setRequestError`
- Read by:
  - `ClusterSetupPanel.requestError`
- Updated by:
  - Setup reset effect sets it to `null`.
  - `handleCalculateElbow` writes validation/API errors and clears it before request.
  - `handleRunClusters` writes selected-K/API errors and clears it before request.
- Affects:
  - UI rendering of setup error `MessageBox`.
  - Does not affect API payloads, validation rules, or chart rendering.

## Derived Values

### `clusterEntries`
- Dependencies: `entries`
- Output shape: `ClusterTeamSeasonEntry[]`, filtered with `hasClusterEntryIds`.
- Used by:
  - `entryOptions`
  - `entriesById`
  - Entry pruning effect.

### `entryOptions`
- Dependencies: `clusterEntries`
- Output shape: `ClusterSetupOption[]`, sorted by label. Each option contains `value`, `label`, `helperText`, `kind`, `logoUrl`, `country`, tag labels, and `searchFields`.
- Used by:
  - `countryFilteredEntryOptions`
  - `ClusterSetupPanel.entryOptions`
  - `ClusterSetupPanel.selectionItems` via props.

### `countryFilteredEntryOptions`
- Dependencies: `entryOptions`, `selectedCountryFilter`
- Output shape: `ClusterSetupOption[]`, filtered by country tab.
- Used by:
  - `ClusterSetupPanel.countryFilteredEntryOptions`
  - Visible team list and visible ALL/CLEAR behavior in `SearchableCheckboxPanel`.

### `entriesById`
- Dependencies: `clusterEntries`
- Output shape: `Map<string, ClusterTeamSeasonEntry>`
- Used by:
  - `selectedEntries`

### `selectedEntries`
- Dependencies: `entriesById`, `selectedEntryIds`
- Output shape: `ClusterTeamSeasonEntry[]`, preserving selected id order and dropping missing entries.
- Used by:
  - `selectedTeamSeasonEntries`
  - `maxAllowedK`
  - `validationMessage`
  - `ClusterSetupPanel.matrixRowCount`

### `selectedTeamSeasonEntries`
- Dependencies: `selectedEntries`
- Output shape: `TeamClusterEntryRequest[]`, with `{ teamId, tournamentId, seasonId }`.
- Used by:
  - `buildRequestPayload`
  - Elbow and cluster API payloads.

### `maxAllowedK`
- Dependencies: not memoized; computed from `selectedEntries.length`
- Output shape: `number`, `Math.max(2, Math.min(20, selectedEntries.length))`
- Used by:
  - Max-K clamp effect.
  - `maxKOptions`
- Note: preserves a minimum of 2 and maximum of 20, even when fewer than two entries are selected.

### `availableStatKeys`
- Dependencies: `supportedStatKeys`
- Output shape: `TeamStatKey[]`, truthy stat keys sorted by display label.
- Used by:
  - `availableStatKeySet`
  - `statOptions`

### `availableStatKeySet`
- Dependencies: `availableStatKeys`
- Output shape: `Set<TeamStatKey>`
- Used by:
  - `cleanedSelectedStatKeys`
  - `toggleStat`
  - `selectVisibleStats`

### `cleanedSelectedStatKeys`
- Dependencies: `selectedStatKeys`, `availableStatKeySet`
- Output shape: `TeamStatKey[]`, sanitized to available keys with duplicates removed while preserving order.
- Used by:
  - Stat cleanup effect.
  - Setup reset effect dependency.
  - `validationMessage`
  - `buildRequestPayload`
  - `useClusterProfiles`
  - `ClusterSetupPanel.matrixColumnCount`
  - `ClusterSetupPanel.selectedStatKeys`
  - `ClusterAverageProfilesChart.statKeys`
  - `ParallelCoordinatesPlot.statKeys`

### `statOptions`
- Dependencies: `availableStatKeys`
- Output shape: `ClusterSetupOption<TeamStatKey>[]`, with `value`, label, helper text, kind, `statKey`, and search fields, filtered to valid labeled options.
- Used by:
  - `categoryFilteredStatOptions`
  - `ClusterSetupPanel.statOptions`
  - `ClusterSetupPanel.selectionItems` via props.

### `categoryFilteredStatOptions`
- Dependencies: `statOptions`, `selectedStatCategory`
- Output shape: `ClusterSetupOption<TeamStatKey>[]`, filtered by statistic category tab.
- Used by:
  - `ClusterSetupPanel.categoryFilteredStatOptions`
  - Visible statistic list and visible ALL/CLEAR behavior in `SearchableCheckboxPanel`.

### `validationMessage`
- Dependencies: `selectedEntries.length`, `cleanedSelectedStatKeys.length`
- Output shape: `string | null`
- Rules:
  - Fewer than 3 selected entries: `"Select at least three team-season entries."`
  - Fewer than 2 selected stats: `"Select at least two statistics."`
  - Otherwise `null`
- Used by:
  - `ClusterSetupPanel.validationMessage`
  - `handleCalculateElbow` guard and error message.

### `buildRequestPayload`
- Dependencies: not memoized; closes over `selectedTeamSeasonEntries`, `cleanedSelectedStatKeys`
- Output shape: `{ teamSeasonEntries: TeamClusterEntryRequest[]; statKeys: TeamStatKey[] }`
- Used by:
  - `handleCalculateElbow`
  - `handleRunClusters`

### `kOptions`
- Dependencies: `elbowResult`
- Output shape: `number[]`, values from `2` through `elbowResult.maxK`, or `[]` when no elbow result exists.
- Used by:
  - `ElbowMethodPanel.kOptions`

### `maxKOptions`
- Dependencies: `maxAllowedK`
- Output shape: `Array<{ value: number; label: string }>` from `2` through `maxAllowedK`.
- Used by:
  - `ClusterSetupPanel.maxKOptions`

### `clusters`
- Dependencies: produced by `useClusterProfiles(clusterResult, cleanedSelectedStatKeys)`
- Output shape: `ClusterGroup[]`
- Used by:
  - `ClusterMembershipSummary.clusters`

### `clusterProfiles`
- Dependencies: produced by `useClusterProfiles(clusterResult, cleanedSelectedStatKeys)`
- Output shape: `ClusterProfile[]`
- Used by:
  - `ClusterAverageProfilesChart.profiles`

## Effects

### Prune selected entry ids
- Dependencies: `clusterEntries`
- Updates: `selectedEntryIds`
- Behavior preserved:
  - Builds a set of currently available cluster entry ids.
  - Filters selected ids to those still present.
- Why it exists:
  - Keeps selection valid when the `entries` prop changes or when entries without required ids are filtered out.

### Prune/sanitize selected stat keys
- Dependencies: `cleanedSelectedStatKeys`, `selectedStatKeys`
- Updates: `selectedStatKeys`
- Behavior preserved:
  - Compares raw selected keys to sanitized keys with `areStatKeyArraysEqual`.
  - Writes cleaned keys only when they differ.
- Why it exists:
  - Removes unavailable or duplicate stat keys while avoiding unnecessary state writes.

### Clamp/reset `maxK` to allowed value
- Dependencies: `maxAllowedK`
- Updates: `maxK`
- Behavior preserved:
  - Always sets `maxK` to the current computed `maxAllowedK`.
- Why it exists:
  - Keeps the Max K select aligned with the selected entry count and hard cap of 20.
  - Important extraction note: this does not preserve a user's previous lower `maxK` when selected entry count changes; it always assigns `maxAllowedK`.

### Reset request outputs after setup changes
- Dependencies: `cleanedSelectedStatKeys`, `maxK`, `selectedEntryIds`
- Updates: `elbowResult`, `clusterResult`, `selectedK`, `requestError`
- Behavior preserved:
  - Clears elbow result, cluster result, selected final K, and request error whenever selected teams, selected stats, or max K change.
- Why it exists:
  - Prevents stale elbow/cluster output from remaining visible after the request inputs change.

### Reset cluster result after selected K changes
- Dependencies: `selectedK`
- Updates: `clusterResult`
- Behavior preserved:
  - Clears only the existing cluster result when final K changes.
- Why it exists:
  - Prevents charts and membership output for an old K from staying visible after the user selects a different K.

## Callbacks And Handlers

### `toggleEntry(entryId: string)`
- Inputs: `entryId`
- Reads: current `selectedEntryIds`
- Writes: `selectedEntryIds`
- API calls: none
- Behavior:
  - Removes the id if selected, otherwise appends it.

### `toggleStat(statKey: string)`
- Inputs: `statKey`
- Reads: `availableStatKeySet`, current `selectedStatKeys`
- Writes: `selectedStatKeys`
- API calls: none
- Behavior:
  - Casts the string to `TeamStatKey`.
  - Returns early if the key is not available.
  - Removes the key if selected, otherwise appends it.

### `selectVisibleEntries(visibleEntryIds: string[])`
- Inputs: visible entry ids from `SearchableCheckboxPanel`
- Reads: current `selectedEntryIds`
- Writes: `selectedEntryIds`
- API calls: none
- Behavior:
  - Appends visible ids that are not already selected.

### `clearVisibleEntries(visibleEntryIds: string[])`
- Inputs: visible entry ids from `SearchableCheckboxPanel`
- Reads: current `selectedEntryIds`
- Writes: `selectedEntryIds`
- API calls: none
- Behavior:
  - Removes any selected ids that are in the visible id set.

### `selectVisibleStats(visibleStatKeys: string[])`
- Inputs: visible stat keys from `SearchableCheckboxPanel`
- Reads: `availableStatKeySet`, current `selectedStatKeys`
- Writes: `selectedStatKeys`
- API calls: none
- Behavior:
  - Filters visible keys to available `TeamStatKey` values.
  - Appends visible stat keys that are not already selected.

### `clearVisibleStats(visibleStatKeys: string[])`
- Inputs: visible stat keys from `SearchableCheckboxPanel`
- Reads: current `selectedStatKeys`
- Writes: `selectedStatKeys`
- API calls: none
- Behavior:
  - Removes any selected stat keys that are in the visible key set.

### Country filter change
- Inputs: `CountryFilterTab`
- Reads: none in the setter itself.
- Writes: `selectedCountryFilter`
- API calls: none
- Behavior:
  - Passed directly as `ClusterSetupPanel.onCountryFilterChange`.
  - Changes visible entries only; it does not clear selected entries.

### Stat category filter change
- Inputs: `StatCategoryFilterId`
- Reads: none in the setter itself.
- Writes: `selectedStatCategory`
- API calls: none
- Behavior:
  - Passed directly as `ClusterSetupPanel.onStatCategoryChange`.
  - Changes visible stats only; it does not clear selected stats.

### Max K change
- Inputs: select value as `string`
- Reads: none in the inline handler.
- Writes: `maxK`
- API calls: none
- Behavior:
  - Passed inline as `(value) => setMaxK(Number(value))`.
  - Changing `maxK` triggers the setup reset effect.

### `buildRequestPayload()`
- Inputs: none
- Reads: `selectedTeamSeasonEntries`, `cleanedSelectedStatKeys`
- Writes: none
- API calls: none
- Behavior:
  - Returns the shared request body base used by both clustering endpoints.

### `handleCalculateElbow()`
- Inputs: none
- Reads:
  - `buildRequestPayload()`
  - `validationMessage`
  - `maxK`
- Writes:
  - `requestError`
  - `loadingElbow`
  - `clusterResult`
  - `elbowResult`
  - `selectedK`
- API calls:
  - `calculateTeamClusterElbow({ ...payload, maxK })`
- Behavior:
  - Builds payload before validation guard.
  - If validation fails, writes `validationMessage ?? "Complete the clustering inputs."` to `requestError` and returns.
  - Before the request, sets `loadingElbow` true, clears `requestError`, and clears `clusterResult`.
  - On success, stores the elbow result and sets `selectedK` to `result.suggestedK ?? Math.min(2, result.maxK)`.
  - On failure, clears `elbowResult` and stores `getErrorMessage(error)`.
  - Always clears `loadingElbow` in `finally`.

### `handleRunClusters()`
- Inputs: none
- Reads:
  - `buildRequestPayload()`
  - `selectedK`
- Writes:
  - `requestError`
  - `loadingClusters`
  - `clusterResult`
- API calls:
  - `runTeamClusters({ ...payload, k: selectedK })`
- Behavior:
  - Builds payload before selected-K guard.
  - If `selectedK == null`, writes `"Calculate elbow data and choose K first."` to `requestError` and returns.
  - Before the request, sets `loadingClusters` true and clears `requestError`.
  - On success, stores the cluster result.
  - On failure, clears `clusterResult` and stores `getErrorMessage(error)`.
  - Always clears `loadingClusters` in `finally`.

## API Flow

### Elbow request payload

```ts
{
  teamSeasonEntries,
  statKeys,
  maxK,
}
```

Where:
- `teamSeasonEntries` is `selectedEntries.map(({ teamId, tournamentId, seasonId }) => ({ teamId, tournamentId, seasonId }))`.
- `statKeys` is `cleanedSelectedStatKeys`.
- `maxK` is the current `maxK` state.

### Cluster run request payload

```ts
{
  teamSeasonEntries,
  statKeys,
  k: selectedK,
}
```

Where:
- `teamSeasonEntries` is the same mapped request entries.
- `statKeys` is `cleanedSelectedStatKeys`.
- `selectedK` must be non-null before `runTeamClusters` is called.

## Data Flow Into Consumers

### `ClusterSetupPanel`
- Receives setup state:
  - `maxK`
  - `selectedEntryIds`
  - `selectedCountryFilter`
  - `selectedStatKeys` as `cleanedSelectedStatKeys`
  - `selectedStatCategory`
  - `loadingElbow`
  - `requestError`
- Receives setup derived values:
  - `maxKOptions`
  - `matrixRowCount` from `selectedEntries.length`
  - `matrixColumnCount` from `cleanedSelectedStatKeys.length`
  - `entryOptions`
  - `countryFilteredEntryOptions`
  - `statOptions`
  - `categoryFilteredStatOptions`
  - `validationMessage`
- Receives handlers:
  - `onMaxKChange`
  - `onEntryToggle`
  - `onSelectVisibleEntries`
  - `onClearVisibleEntries`
  - `onCountryFilterChange`
  - `onStatToggle`
  - `onSelectVisibleStats`
  - `onClearVisibleStats`
  - `onStatCategoryChange`
  - `onCalculateElbow`

### `ElbowMethodPanel`
- Rendered only when `elbowResult` is truthy.
- Receives:
  - `elbowResult`
  - `selectedK`
  - `kOptions`
  - `loadingClusters`
  - `onSelectedKChange` as `setSelectedK`
  - `onRunClusters` as `handleRunClusters`

### `useClusterProfiles`
- Called as `useClusterProfiles(clusterResult, cleanedSelectedStatKeys)`.
- Receives:
  - `clusterResult`
  - `cleanedSelectedStatKeys`
- Returns:
  - `clusters` for membership summary.
  - `clusterProfiles` for average profiles chart.

### `ClusterAverageProfilesChart`
- Rendered only when `clusterResult` is truthy because it is inside the cluster result section.
- Receives:
  - `profiles={clusterProfiles}`
  - `statKeys={cleanedSelectedStatKeys}`

### `ParallelCoordinatesPlot`
- Rendered only when `clusterResult` is truthy.
- Receives:
  - `result={clusterResult}`
  - `statKeys={cleanedSelectedStatKeys}`

### `ClusterMembershipSummary`
- Rendered only when `clusterResult` is truthy.
- Receives:
  - `clusters={clusters}`

## Extraction Recommendation

### Move first into `useClusterSetupData`
- `clusterEntries`
- `entryOptions`
- `countryFilteredEntryOptions`
- `entriesById`
- `availableStatKeys`
- `availableStatKeySet`
- `statOptions`
- `categoryFilteredStatOptions`
- `maxAllowedK`
- `maxKOptions`
- Rationale: these are pure derivations from props and filter state. They have no API side effects and can be validated by comparing returned shapes and panel props.

### Move first into `useClusterSelectionState`
- `selectedEntryIds`
- `selectedStatKeys`
- `selectedCountryFilter`
- `selectedStatCategory`
- `maxK`
- `selectedK`
- `selectedEntries`
- `selectedTeamSeasonEntries`
- `cleanedSelectedStatKeys`
- `validationMessage`
- Selection handlers:
  - `toggleEntry`
  - `toggleStat`
  - `selectVisibleEntries`
  - `clearVisibleEntries`
  - `selectVisibleStats`
  - `clearVisibleStats`
  - filter setters
  - max-K setter wrapper
- Reset/pruning effects:
  - selected entry pruning
  - selected stat cleanup
  - max-K clamp
- Rationale: these values own setup inputs and validation. Keep return values explicit and typed so the tab can pass the same props to `ClusterSetupPanel` and `ElbowMethodPanel`.

### Move first into `useClusterRequests`
- `elbowResult`
- `clusterResult`
- `loadingElbow`
- `loadingClusters`
- `requestError`
- `kOptions`
- `buildRequestPayload`
- `handleCalculateElbow`
- `handleRunClusters`
- Reset effects tied to request output:
  - clear elbow/cluster/selectedK/error when `cleanedSelectedStatKeys`, `maxK`, or `selectedEntryIds` change.
  - clear cluster result when `selectedK` changes.
- Rationale: this isolates API behavior and request state. It should accept the already-derived request entries, cleaned stat keys, `maxK`, `selectedK`, selected-K setter, `selectedEntryIds`, and `validationMessage` rather than recomputing setup data.

Suggested extraction order:
1. Extract pure setup derivations.
2. Extract selection state and pruning/clamp effects.
3. Extract API request state and reset effects after selection behavior is stable.
