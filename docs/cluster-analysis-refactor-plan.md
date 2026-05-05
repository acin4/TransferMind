# ClusterAnalysisTab.tsx Refactor Plan

## Purpose

`ClusterAnalysisTab.tsx` has grown into a full feature module instead of a single tab component. It currently mixes page state, API calls, selector UI, clustering result rendering, SVG chart rendering, formatting helpers, chart math helpers, and local TypeScript types in one file.

The goal of this refactor is to split the file into smaller, focused files while keeping the current behavior unchanged.

## Current file status

- File: `frontend/src/components/ClusterAnalysisTab.tsx`
- Current size: about 1,960 lines
- Main issue: too many responsibilities in one component file
- Desired result: keep `ClusterAnalysisTab.tsx` as the public entry component, but move helpers, charts, result panels, and reusable UI into focused files

## Core refactor rules

These rules apply to every step:

1. Do not change API contracts.
2. Do not change backend behavior.
3. Do not change database schema.
4. Do not change clustering logic.
5. Do not change K-Means, Elbow, selected team behavior, selected stat behavior, or normalization behavior.
6. Do not change visual design unless a step explicitly says so.
7. Do not introduce new dependencies.
8. Do not create custom hooks until the component extraction is complete and working.
9. After every step, run the available typecheck/build checks.
10. Keep each Codex task small enough to review safely.

Recommended checks after every step:

```bash
npm run build
npm run lint
npm run typecheck
```

If the project does not have all of these scripts, run the closest available checks from `package.json`.

## Target folder structure

```txt
frontend/src/components/teams-comparison
  ClusterAnalysisTab.tsx

frontend/src/components/teams-comparison/cluster-analysis/
  constants.ts
  types.ts

  components/
    ClusterSetupPanel.tsx
    ElbowMethodPanel.tsx
    ClusterAverageProfilesChart.tsx
    ParallelCoordinatesPlot.tsx
    EntrySelectionList.tsx
    SelectedEntryDetailsPanel.tsx
    ClusterMembershipSummary.tsx
    ClusterAverageDetailsPanel.tsx
    ClusterLegend.tsx
    ClusterSelectionControls.tsx
    ClusterFilterControls.tsx
    MessageBox.tsx
    SelectField.tsx

  hooks/
    useClusterAnalysisState.ts
    useClusterProfiles.ts
    useParallelCoordinatesData.ts

  utils/
    clusterAnalysisUtils.ts
    clusterChartUtils.ts
    clusterFormatters.ts
```

This is the ideal final structure. Do not create all files at once unless the step needs them.

---

# Step 1 — Baseline audit before editing

## Goal

Create a clear snapshot of what exists before moving code. This step should not modify behavior.

## What Codex should do

- Inspect `ClusterAnalysisTab.tsx`.
- List all internal components.
- List all helper functions.
- List all local types.
- List all constants.
- Identify which helpers are pure and safe to move.
- Identify any functions that depend directly on React state and should stay for now.
- Do not edit files unless adding an audit note is explicitly desired.

## Codex prompt

```txt
Audit `frontend/src/components/ClusterAnalysisTab.tsx` before refactoring.

Do not change runtime behavior.
Do not change UI, styling, API calls, clustering logic, normalization, selected team/stat behavior, or chart rendering.

Please inspect the file and produce a concise refactor map with:
- all local constants
- all local TypeScript types
- all internal React components
- all pure helper functions
- all formatter functions
- all chart math/helper functions
- functions that should not be moved yet because they depend on component state or effects

Also propose the safest extraction order.

Do not edit implementation files in this step unless needed to add a short temporary audit document. If you create an audit document, place it under `frontend/src/components/cluster-analysis/refactor-audit.md`.
```

## Acceptance criteria

- You understand what will be moved before any code is changed.
- No behavior changes.
- No broken imports.

---

# Step 2 — Extract constants and types

## Goal

Move low-risk static definitions out of the main file.

## Move to `constants.ts`

Move constants such as:

```txt
CLUSTER_COLORS
CHART_Y_TICKS
CHART_MARGIN
CLUSTER_AVERAGE_CHART_HEIGHT
PARALLEL_COORDINATES_CHART_HEIGHT
MIN_CHART_WIDTH
STAT_AXIS_WIDTH
```

## Move to `types.ts`

Move local types such as:

```txt
ClusterAnalysisTabProps
ClusterProfile
ClusterInsightStat
ClusterLegendItem
ClusterFilterValue
StatDisplayItem
ParallelCoordinatesPoint
ParallelCoordinatesPathRow
ClusterTeamSeasonEntry
```

Only move types that are truly local to Cluster Analysis.

## Codex prompt

```txt
Refactor `frontend/src/components/ClusterAnalysisTab.tsx` by extracting only local constants and local TypeScript types into a new feature folder.

Create these files:
- `frontend/src/components/cluster-analysis/constants.ts`
- `frontend/src/components/cluster-analysis/types.ts`

Move only safe static definitions:
- local chart constants
- local cluster color constants
- local TypeScript types used by Cluster Analysis

Do not move React components yet.
Do not move helper functions yet.
Do not create hooks yet.
Do not change runtime behavior, UI layout, styling, API calls, clustering logic, normalization, selected team/stat behavior, or chart rendering.

Update imports in `ClusterAnalysisTab.tsx` as needed.
Avoid circular imports.

After the change, run the available TypeScript/build checks and fix any import/type errors.
Summarize exactly what was moved.
```

## Acceptance criteria

- `ClusterAnalysisTab.tsx` imports constants/types from the new files.
- No runtime logic changed.
- TypeScript/build passes.

---

# Step 3 — Extract pure helper and formatter functions

## Goal

Move non-React logic out of the component file.

## Create utility files

```txt
frontend/src/components/cluster-analysis/utils/clusterAnalysisUtils.ts
frontend/src/components/cluster-analysis/utils/clusterChartUtils.ts
frontend/src/components/cluster-analysis/utils/clusterFormatters.ts
```

## Move to `clusterAnalysisUtils.ts`

Move pure cluster/data helpers such as:

```txt
buildClusterGroups
buildClusterProfiles
getClusterInsightStats
getClusterFilterOptions
hasClusterEntryIds
sanitizeSelectedStatKeys
areStatKeyArraysEqual
```

## Move to `clusterChartUtils.ts`

Move chart helpers such as:

```txt
getClusterColor
clamp01
getNormalizedDisplayValue
truncateLabel
buildStatDisplayItems
getChartWidth
buildXCoordinates
formatNormalizedStatValue
```

## Move to `clusterFormatters.ts`

Move display/formatter helpers such as:

```txt
formatInsightLabels
getClusterFilterButtonClass
getErrorMessage
getSafeStatLabel
getAssignmentSeasonLabel
getAssignmentTournamentLabel
getAssignmentSearchText
formatDisplayRawStatValue
safeCompareLabels
```

## Codex prompt

```txt
Refactor `frontend/src/components/ClusterAnalysisTab.tsx` by extracting only pure helper functions and formatter functions into utility files under `frontend/src/components/cluster-analysis/utils/`.

Create these files if needed:
- `clusterAnalysisUtils.ts`
- `clusterChartUtils.ts`
- `clusterFormatters.ts`

Move only functions that are pure and do not depend on React state, React effects, local component closures, or DOM/SVG runtime state.

Suggested grouping:
- cluster/data helpers -> `clusterAnalysisUtils.ts`
- chart math helpers -> `clusterChartUtils.ts`
- labels, errors, display formatting -> `clusterFormatters.ts`

Do not extract React components yet.
Do not create hooks yet.
Do not change runtime behavior, UI layout, styling, API calls, clustering logic, normalization, selected team/stat behavior, or chart rendering.

Update imports and exports carefully.
Avoid circular imports between `types.ts`, `constants.ts`, and utility files.

After the change, run the available TypeScript/build checks and fix any errors.
Summarize exactly what was moved and confirm behavior is intended to remain unchanged.
```

## Acceptance criteria

- Pure helper functions no longer live in `ClusterAnalysisTab.tsx`.
- The main file is smaller but behavior is unchanged.
- TypeScript/build passes.

---

# Step 4 — Extract small shared UI components

## Goal

Move small presentational components first before touching the bigger charts.

## Move these components

```txt
SelectField.tsx
MessageBox.tsx
ClusterLegend.tsx
ClusterSelectionControls.tsx
ClusterFilterControls.tsx
```

These should be mostly presentational and easier to verify.

## Codex prompt

```txt
Refactor `frontend/src/components/ClusterAnalysisTab.tsx` by extracting small presentational React components into `frontend/src/components/cluster-analysis/components/`.

Extract only these components if they exist in the current file:
- `SelectField`
- `MessageBox`
- `ClusterLegend`
- `ClusterSelectionControls`
- `ClusterFilterControls`

Do not extract big chart components yet.
Do not extract result/detail panels yet.
Do not create hooks yet.
Do not change runtime behavior, UI layout, styling, API calls, clustering logic, normalization, selected team/stat behavior, or chart rendering.

Keep props explicit and typed.
Preserve `memo` usage where it already exists.
Avoid changing class names or markup unless required for imports/types.

After the change, run the available TypeScript/build checks and fix any errors.
Summarize exactly what was extracted.
```

## Acceptance criteria

- Small UI components are in separate files.
- Main component imports them cleanly.
- TypeScript/build passes.
- No visible UI change.

---

# Step 5 — Extract the Elbow Method section

## Goal

Separate the Elbow chart and K selection UI from the main tab.

## Move these pieces

```txt
ElbowMethodPanel.tsx
ElbowTooltip.tsx, if useful
```

This component should receive props from `ClusterAnalysisTab.tsx`, such as:

```txt
elbowResult
selectedK
setSelectedK
maxAllowedK
loadingClusters
canRunClusters
onRunClusters
```

Exact prop names can follow the existing code style.

## Codex prompt

```txt
Extract the Elbow Method UI from `frontend/src/components/ClusterAnalysisTab.tsx` into `frontend/src/components/cluster-analysis/components/ElbowMethodPanel.tsx`.

The extracted component should include:
- the final K selector/control
- the Run K-Means action area
- the Recharts elbow chart
- the elbow tooltip component if it is currently local to `ClusterAnalysisTab.tsx`

Keep `ClusterAnalysisTab.tsx` responsible for state and API calls for now.
Pass required values and callbacks into `ElbowMethodPanel` through explicit typed props.

Do not change runtime behavior, UI layout, styling, API calls, clustering logic, normalization, selected team/stat behavior, or chart rendering.
Do not create hooks yet.
Do not change the chart data shape.
Do not change the button enable/disable rules.

Preserve existing class names and markup as much as possible.
After the change, run the available TypeScript/build checks and fix any errors.
Summarize exactly what was extracted.
```

## Acceptance criteria

- Elbow UI is isolated.
- Main tab still owns state/API behavior.
- Chart looks and behaves the same.
- TypeScript/build passes.

---

# Step 6 — Extract Cluster Average Profiles chart

## Goal

Move the cluster-average SVG chart into its own component file.

## Move this component

```txt
ClusterAverageProfilesChart.tsx
```

This component is large and should be isolated before the parallel coordinates plot.

## Codex prompt

```txt
Extract `ClusterAverageProfilesChart` from `frontend/src/components/ClusterAnalysisTab.tsx` into `frontend/src/components/cluster-analysis/components/ClusterAverageProfilesChart.tsx`.

Move only this chart component and any tiny local types/helpers that are exclusively required by it. Prefer importing shared helpers from existing `utils/` files instead of duplicating code.

Do not change runtime behavior, chart rendering, SVG markup, class names, styling, clustering logic, normalization, selected team/stat behavior, or API calls.
Do not create hooks yet.
Do not refactor the chart internals beyond the minimum needed to move the component.

Keep `memo` if the component currently uses it.
Use explicit typed props.
Avoid circular imports.

After the change, run the available TypeScript/build checks and fix any errors.
Summarize exactly what was extracted.
```

## Acceptance criteria

- `ClusterAverageProfilesChart.tsx` exists and renders the same chart.
- Main tab imports and uses it.
- TypeScript/build passes.
- No visual behavior changed.

---

# Step 7 — Extract Parallel Coordinates plot

## Goal

Move the largest and most complex chart into its own component file.

## Move this component

```txt
ParallelCoordinatesPlot.tsx
```

This component likely contains:

- SVG path rendering
- cluster filters
- search/filter behavior
- selected line/team behavior
- selected entry details
- local chart calculations

Be careful not to change behavior while moving it.

## Codex prompt

```txt
Extract `ParallelCoordinatesPlot` from `frontend/src/components/ClusterAnalysisTab.tsx` into `frontend/src/components/cluster-analysis/components/ParallelCoordinatesPlot.tsx`.

This is a move-only refactor.

Preserve:
- SVG rendering
- search behavior
- cluster filter behavior
- selected entry behavior
- selected/deselected line behavior
- normalized 0-1 display behavior
- raw value display behavior
- existing class names and styling
- `memo` usage if present

Do not change API calls.
Do not change K-Means or Elbow logic.
Do not change clustering result shape.
Do not create hooks yet.
Do not optimize behavior in this step.

Use explicit typed props.
Import shared types/helpers/constants from the new cluster-analysis files.
Avoid circular imports.

After the change, run the available TypeScript/build checks and fix any errors.
Summarize exactly what was extracted and confirm that chart behavior is intended to remain unchanged.
```

## Acceptance criteria

- `ParallelCoordinatesPlot.tsx` exists and is imported by the main tab.
- The parallel coordinates chart behaves the same.
- Team/cluster selection and deselection still work.
- TypeScript/build passes.

---

# Step 8 — Extract result and detail panels

## Goal

Move cluster result sections out of the main tab.

## Move these components

```txt
EntrySelectionList.tsx
SelectedEntryDetailsPanel.tsx
ClusterMembershipSummary.tsx
ClusterAverageDetailsPanel.tsx
```

These are lower risk after chart extraction because they mostly render existing data.

## Codex prompt

```txt
Extract the remaining cluster result/detail components from `frontend/src/components/ClusterAnalysisTab.tsx` into `frontend/src/components/cluster-analysis/components/`.

Extract these components if they still live in the main file:
- `EntrySelectionList`
- `SelectedEntryDetailsPanel`
- `ClusterMembershipSummary`
- `ClusterAverageDetailsPanel`

This is a move-only refactor.

Do not change runtime behavior, UI layout, styling, API calls, clustering logic, normalization, selected team/stat behavior, or chart rendering.
Do not create hooks yet.
Do not rename visible labels unless required to preserve existing behavior.

Use explicit typed props.
Preserve `memo` usage where it already exists.
Import shared types/helpers/constants from the new cluster-analysis files.
Avoid circular imports.

After the change, run the available TypeScript/build checks and fix any errors.
Summarize exactly what was extracted.
```

## Acceptance criteria

- Result panels are separate files.
- Main tab is significantly smaller.
- TypeScript/build passes.
- No visual behavior changed.

---

# Step 9 — Extract Cluster setup UI

## Goal

Move the setup/selection area into a dedicated component while keeping the main tab as the state owner.

## Create this component

```txt
ClusterSetupPanel.tsx
```

This component may include:

- country tabs
- team-season selector
- stat category tabs
- stat selector
- max K selector
- selected matrix count
- validation message
- Calculate Elbow button

## Important

This step may require many props. That is acceptable at first. Do not create a hook just to reduce prop count yet.

## Codex prompt

```txt
Extract the Cluster Analysis setup/selection UI from `frontend/src/components/ClusterAnalysisTab.tsx` into `frontend/src/components/cluster-analysis/components/ClusterSetupPanel.tsx`.

The new component should render the current setup area, including the existing team-season selector, country tabs, stat category tabs, stat selector, matrix count, max K control, validation message, and Calculate Elbow action if those are currently part of the main setup section.

Keep `ClusterAnalysisTab.tsx` as the owner of state, derived values, and API calls for now.
Pass values and callbacks through explicit typed props.

Do not change runtime behavior, UI layout, styling, API calls, clustering logic, normalization, selected team/stat behavior, or chart rendering.
Do not create hooks yet.
Do not change `SearchableCheckboxPanel`, `StatCategoryFilterTabs`, or `SegmentedTabs` behavior.
Do not change ALL/CLEAR selection behavior.

After the change, run the available TypeScript/build checks and fix any errors.
Summarize exactly what was extracted.
```

## Acceptance criteria

- Setup UI is in `ClusterSetupPanel.tsx`.
- Main tab still owns state and API calls.
- ALL/CLEAR behavior still works.
- TypeScript/build passes.

---

# Step 10 — Extract custom hooks, only after component extraction works

## Goal

Make the main tab easier to read by moving derived state and event handlers into hooks.

Only do this after Steps 1-9 are complete and stable.

## Possible hooks

```txt
useClusterAnalysisState.ts
useClusterProfiles.ts
useParallelCoordinatesData.ts
```

## Suggested responsibilities

### `useClusterAnalysisState.ts`

Can manage:

- selected entries
- selected stats
- country filter
- stat category filter
- max K
- selected K
- elbow result
- cluster result
- loading states
- request errors
- event handlers

### `useClusterProfiles.ts`

Can derive:

- cluster groups
- cluster profiles
- cluster insight stats
- cluster filter options

### `useParallelCoordinatesData.ts`

Can derive:

- stat display items
- x coordinates
- chart rows
- cluster paths
- selected path details

## Codex prompt

```txt
Now that the Cluster Analysis components have been extracted and the feature is working, refactor state/derived logic carefully into hooks under `frontend/src/components/cluster-analysis/hooks/`.

Start with the lowest-risk hook extraction only.
Prefer one hook in this task, not all hooks at once.

Suggested first hook:
- `useClusterProfiles.ts`

Move only derived cluster profile logic that is currently based on `clusterResult` and selected stat keys.
Do not move API calls in this step.
Do not move setup selection state in this step.

Do not change runtime behavior, UI layout, styling, API calls, clustering logic, normalization, selected team/stat behavior, or chart rendering.
Keep return values explicit and typed.
Avoid circular imports.

After the change, run the available TypeScript/build checks and fix any errors.
Summarize exactly what was moved into the hook.
```

## Follow-up Codex prompt for state hook

Use this only after the first hook extraction works.

```txt
Extract Cluster Analysis setup and request state from `ClusterAnalysisTab.tsx` into `frontend/src/components/cluster-analysis/hooks/useClusterAnalysisState.ts`.

This hook may own:
- selected entry ids
- selected stat keys
- selected country filter
- selected stat category
- max K
- selected K
- elbow result
- cluster result
- loading states
- request error
- event handlers for selection and requests

Keep behavior identical.
Do not change API payload shape.
Do not change validation rules.
Do not change reset behavior when selected teams/stats/maxK/selectedK change.
Do not change ALL/CLEAR behavior.
Do not change normalization or clustering logic.
Do not change UI styling or markup.

Keep the hook return value explicit and typed.
Avoid over-abstracting.
After the change, run the available TypeScript/build checks and fix any errors.
Summarize exactly what moved into the hook.
```

## Acceptance criteria

- `ClusterAnalysisTab.tsx` mostly composes components and hooks.
- Behavior remains identical.
- TypeScript/build passes.

---

# Step 11 — Performance cleanup after the structural refactor

## Goal

Improve responsiveness only after the file split is complete.

Do not mix performance changes with move-only refactors.

## Safe performance targets

- Ensure expensive derived arrays are wrapped in `useMemo`.
- Ensure event handlers passed to memoized children use `useCallback` where it helps.
- Avoid recalculating chart path data on unrelated input changes.
- Avoid rendering all individual team lines when a cluster filter/search narrows the visible set.
- Keep hover behavior removed if it was already removed for performance.
- Keep click-to-select behavior.
- Consider list virtualization only if the team/stat lists are very large.

## Codex prompt

```txt
Review the refactored Cluster Analysis feature for safe performance improvements.

Focus only on frontend render performance.

Do not change API calls, clustering logic, normalization, selected team/stat behavior, chart meaning, or visual design.
Do not reintroduce hover-based line highlighting.
Keep click-based selection/deselection behavior.

Look for:
- expensive derived arrays that should be memoized
- callbacks passed to memoized children that should use `useCallback`
- unnecessary recalculation of chart path rows
- unnecessary rerenders of large chart/list components
- opportunities to reduce work when cluster/search filters are active

Make only low-risk changes.
Do not add new dependencies unless absolutely necessary and approved.
Do not virtualize lists in this step unless the project already has a virtualization dependency.

After the change, run the available TypeScript/build checks and fix any errors.
Summarize each performance change and why it is safe.
```

## Acceptance criteria

- Page remains visually the same.
- Selection/deselection still works.
- Charts still represent the same data.
- TypeScript/build passes.

---

# Step 12 — Final cleanup and documentation

## Goal

Remove leftover dead code and document the new structure.

## What to clean

- unused imports
- unused local types
- unused helper functions
- duplicate utilities
- unnecessary prop drilling if a hook already owns the logic
- inconsistent file names

## Optional documentation

Create:

```txt
frontend/src/components/cluster-analysis/README.md
```

This README should briefly explain:

- what each folder contains
- where state lives
- where API calls happen
- where chart helpers live
- which components are presentational

## Codex prompt

```txt
Perform a final cleanup pass on the refactored Cluster Analysis feature.

Scope:
- `frontend/src/components/ClusterAnalysisTab.tsx`
- `frontend/src/components/cluster-analysis/`

Remove unused imports, unused types, unused helpers, and duplicate code introduced during extraction.
Do not change runtime behavior, UI layout, styling, API calls, clustering logic, normalization, selected team/stat behavior, or chart rendering.

Add a short `frontend/src/components/cluster-analysis/README.md` explaining:
- the purpose of the feature folder
- where state lives
- where API calls happen
- where chart helpers live
- where presentational components live
- how future changes should be added safely

After the change, run the available TypeScript/build checks and fix any errors.
Summarize the cleanup and list the final file structure.
```

## Acceptance criteria

- No unused imports or obvious dead code.
- Feature folder has a short README.
- TypeScript/build passes.
- The final structure is easy to understand.

---

# Final desired result

After the full refactor, `ClusterAnalysisTab.tsx` should mainly do this:

```txt
- receive entries and supported stat keys
- connect state/hooks
- call API handlers
- compose ClusterSetupPanel, ElbowMethodPanel, and ClusterResultsSection/components
```

It should no longer contain:

```txt
- large SVG chart implementations
- local chart math helpers
- result panel markup
- long formatter functions
- local type clutter
- repeated cluster display logic
```

Expected rough final size:

```txt
ClusterAnalysisTab.tsx                 150-300 lines
ClusterSetupPanel.tsx                  150-300 lines
ElbowMethodPanel.tsx                   100-200 lines
ClusterAverageProfilesChart.tsx        180-280 lines
ParallelCoordinatesPlot.tsx            220-380 lines
clusterAnalysisUtils.ts                100-200 lines
clusterChartUtils.ts                   80-160 lines
clusterFormatters.ts                   80-160 lines
types.ts                               50-120 lines
constants.ts                           20-60 lines
```

The exact line count is less important than the separation of responsibilities.

---

# Manual QA checklist

Run this checklist after each major phase, especially after chart extraction and hook extraction.

## Setup behavior

- Can select team-season entries.
- Can deselect team-season entries.
- Can select statistics.
- Can deselect statistics.
- Country tabs filter entries correctly.
- Stat category tabs filter stats correctly.
- ALL and CLEAR behave exactly as before.
- Hidden selected entries/stats still count correctly if that was the previous behavior.

## Elbow behavior

- Cannot calculate elbow with invalid selections.
- Can calculate elbow with valid selections.
- Elbow result appears correctly.
- Final K can be selected.
- `k == selectedTeamCount` remains allowed if this was already supported.
- Existing warning behavior remains unchanged.

## K-Means behavior

- Can run clustering after selecting final K.
- Cluster assignments count matches selected team-season count.
- Cluster groups are correct.
- Cluster average profiles render correctly.
- Parallel coordinates chart renders correctly.

## Chart behavior

- Cluster colors remain consistent.
- Normalized values remain in the 0-1 range.
- Raw values still display correctly.
- Against stats are not accidentally inverted unless a separate task explicitly changes that.
- Click selection works.
- Click deselection works.
- Hover behavior is not reintroduced.

## Error/loading behavior

- Loading states still appear correctly.
- API errors still show correctly.
- Changing selected entries/stats resets stale results as before.
- Changing final K resets cluster results as before.

---

# Important warning

Do not use the refactor as an opportunity to change how negative or against stats are normalized.

That is a separate analytical decision and should be handled in a separate task after the structural refactor is complete.

A good future task would be:

```txt
Audit selected team stats and classify whether each stat is positive-oriented or negative-oriented. Then update normalization display logic so lower-is-better stats can be inverted consistently, without changing backend clustering unless explicitly required.
```
