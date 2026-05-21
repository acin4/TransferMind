# Cluster Analysis Hook Refactor Prompts

This file breaks the large `useClusterAnalysisState` refactor into smaller, safer Codex prompts.

Recommended order:

```txt
1. Audit current ClusterAnalysisTab state/data flow
2. Extract pure derived setup data
3. Extract setup selection state only
4. Move setup selection handlers into that hook
5. Extract elbow + cluster request state/API handlers
6. Optional: create one wrapper hook that composes the smaller hooks
```

Run `npm run build` and `npm run lint` after each implementation step before moving to the next prompt.

---

## Prompt 1 — Audit only, no code changes

Use this first. It makes Codex map the current file before touching it.

````md
# Audit ClusterAnalysisTab State And Derived Data Before Hook Extraction

## Summary

Inspect `frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx` and document the current state, derived values, effects, callbacks, and API handlers related to Cluster Analysis. Do not edit code.

## Goal

Prepare for a safe hook extraction by identifying exactly which values are owned by `ClusterAnalysisTab.tsx` and how they flow into:

- `ClusterSetupPanel`
- `ElbowMethodPanel`
- `ClusterAverageProfilesChart`
- `ParallelCoordinatesPlot`
- `ClusterMembershipSummary`
- `useClusterProfiles`

## Required Audit Output

Create or update a temporary markdown file:

`frontend/src/components/cluster-analysis/state-extraction-audit.md`

Document the following sections:

### State Values

List all `useState` values in `ClusterAnalysisTab.tsx`, including:

- selected entry ids
- selected stat keys
- country filter
- stat category filter
- max K
- selected K
- elbow result
- cluster result
- loading flags
- request error
- any other local state

For each value, document:

- initial value
- setter name
- where it is read
- where it is updated
- whether it affects API payloads, UI rendering, validation, or chart rendering

### Derived Values

List all `useMemo` or derived values related to setup, validation, request payloads, and K options, including:

- cluster entries
- entry options
- stat options
- filtered entry options
- filtered stat options
- selected entries
- cleaned selected stat keys
- request payload entries
- validation message
- max K options
- K options
- any other derived setup/request values

For each value, document:

- dependencies
- output shape
- where it is used

### Effects

List reset/pruning effects and document:

- dependencies
- values they update
- behavior they preserve
- why they exist

### Callbacks And Handlers

List all setup/request handlers, including:

- toggle entry
- toggle stat
- select visible entries
- clear visible entries
- select visible stats
- clear visible stats
- filter changes
- max K change
- calculate elbow
- run clusters

For each handler, document:

- inputs
- state it reads
- state it writes
- API calls, if any

### API Flow

Document the exact elbow request payload:

```ts
{
  (teamSeasonEntries, statKeys, maxK);
}
```
````

Document the exact cluster run request payload:

```ts
{ teamSeasonEntries, statKeys, k: selectedK }
```

### Extraction Recommendation

At the end, recommend which values can be safely moved first into:

- `useClusterSetupData`
- `useClusterSelectionState`
- `useClusterRequests`

## Strict Rules

- Do not edit TypeScript, TSX, CSS, API files, backend files, or existing component files.
- Do not rename anything.
- Do not move code.
- This is audit/documentation only.

## Test Plan

No build is required because this is documentation only.

````

---

## Prompt 2 — Extract pure derived setup data only

This is low-risk because it moves only `useMemo`/derived data. No state, no effects, no API calls.

```md
# Extract useClusterSetupData Derived Hook

## Summary
Create `frontend/src/components/cluster-analysis/hooks/useClusterSetupData.ts` and move only pure derived setup data from `ClusterAnalysisTab.tsx` into it.

This hook must not own state, effects, API calls, loading flags, request errors, or selection handlers.

## Key Changes
- Add `useClusterSetupData.ts`.
- Move only derived setup values currently computed in `ClusterAnalysisTab.tsx`, such as:
  - cluster entries
  - entry options
  - stat options
  - filtered entry options
  - filtered stat options
  - selected entries
  - cleaned selected stat keys
  - request payload entries
  - validation message
  - max K options
- Keep all state values in `ClusterAnalysisTab.tsx`.
- Keep all effects in `ClusterAnalysisTab.tsx`.
- Keep all handlers in `ClusterAnalysisTab.tsx`.
- Keep all API calls in `ClusterAnalysisTab.tsx`.
- Keep `kOptions`, `elbowResult`, `selectedK`, and `clusterResult` outside this hook for now unless they are purely setup-derived and already identified as safe in the audit.

## Hook Interface
Create explicit exported params/result types, either in `useClusterSetupData.ts` or in `frontend/src/components/cluster-analysis/types.ts`.

The hook should receive the current parent-owned state and inputs, for example:
- `entries`
- `statKeys`
- `selectedEntryIds`
- `selectedStatKeys`
- `countryFilter`
- `statCategoryFilter`
- `maxK`

The hook should return the same derived values currently used by `ClusterAnalysisTab.tsx`.

Use the existing variable names where practical so the parent diff stays mechanical.

## Required Helpers
Reuse existing helpers only:
- `sanitizeSelectedStatKeys`
- `hasClusterEntryIds`
- `filterItemsByCountry`
- `filterTeamStatItemsByCategory`
- `getSafeStatLabel`
- `safeCompareLabels`
- any existing option-building logic currently in `ClusterAnalysisTab.tsx`

Do not rewrite helper logic.

## Strict Preservation Rules
Do not change:
- validation strings
- validation rules
- sorting behavior
- filtering behavior
- option labels
- selected entry/stat behavior
- request payload entry shape
- max K option behavior
- ALL/CLEAR behavior
- UI markup
- API calls
- clustering logic
- normalization logic

## Import Rules
- Use `import type` for TypeScript-only imports.
- The hook must not import from `ClusterAnalysisTab.tsx`.
- Avoid circular imports.

## Test Plan
Run from `frontend/`:
- `npm run build`
- `npm run lint`

Fix only errors caused by this extraction.
````

---

## Prompt 3 — Extract selection state and pruning effects only

This moves state, but not API requests yet.

```md
I would change the prompt to this safer version:

# Extract `useClusterSelectionState`

## Summary

Create `frontend/src/components/cluster-analysis/hooks/useClusterSelectionState.ts` to own only Cluster Analysis setup state. Do not move pruning/reset effects yet.

Keep setup derivations in `useClusterSetupData`.
Keep API request state, selected K, result state, request handlers, payload construction, and `useClusterProfiles(clusterResult, cleanedSelectedStatKeys)` in `ClusterAnalysisTab.tsx`.

## Key Changes

- Move only these state initializers into the hook with the same defaults:
  - `selectedEntryIds`
  - `selectedStatKeys`
  - `selectedCountryFilter`
  - `selectedStatCategory`
  - `maxK`

- Do not move effects in this step.
- Do not move handlers in this step.
- Do not duplicate setup derivation logic inside this hook.
- Do not derive cluster entries, valid stat keys, cleaned stat keys, or max allowed K inside this hook.

## Public Types

- Export explicit hook types:
  - `UseClusterSelectionStateParams`
  - `UseClusterSelectionStateResult`

The params type may be empty for now if the hook only owns state.

Return the parent-facing names needed by the existing component:

- `selectedEntryIds`, `setSelectedEntryIds`
- `selectedStatKeys`, `setSelectedStatKeys`
- `selectedCountryFilter`, `setSelectedCountryFilter`
- `selectedStatCategory`, `setSelectedStatCategory`
- `maxK`, `setMaxK`

Use `import type` for TypeScript-only imports.
Do not import from `ClusterAnalysisTab.tsx`.

## Strict Preservation Rules

Copy the existing state defaults exactly.

Do not change:

- selected team behavior
- selected stat behavior
- country filter behavior
- stat category behavior
- max K behavior
- setup derivations
- pruning/reset effects
- API calls
- request payload construction
- clustering logic
- UI behavior

## Test Plan

Run from `frontend/`:

- `npm run build`
- `npm run lint`

Fix only errors introduced by this extraction.

## Assumptions

- This step intentionally moves state only.
- Setup pruning/reset effects remain in `ClusterAnalysisTab.tsx` until the next extraction step.

---

Then make the next prompt:

# Extract `useClusterSetupMaintenanceEffects`

## Summary

Create `frontend/src/components/cluster-analysis/hooks/useClusterSetupMaintenanceEffects.ts` to own only the setup pruning/reset effects currently left in `ClusterAnalysisTab.tsx`.

This hook must receive already-derived values from `useClusterSetupData` instead of recomputing them.

## Key Changes

Move only these effects:

- prune selected entry ids when available cluster entries change
- sync selected stat keys to cleaned valid stat keys
- reset `maxK` to the computed max allowed K

The hook should receive:

- `clusterEntries`
- `cleanedSelectedStatKeys`
- `maxAllowedK`
- `selectedEntryIds`
- `setSelectedEntryIds`
- `selectedStatKeys`
- `setSelectedStatKeys`
- `maxK`
- `setMaxK`

Do not duplicate setup derivation logic.
Do not move API/result reset effects.

## Strict Preservation Rules

Copy the existing effects exactly.

Do not:

- merge effects
- reorder effects
- simplify effects
- change dependency behavior unless required by extraction
- change selected team/stat pruning behavior
- change max K reset behavior
- move API request logic
- move selectedK/elbow/cluster reset logic

## Test Plan

Run from `frontend/`:

- `npm run build`
- `npm run lint`

Fix only errors introduced by this extraction.
```

---

## Prompt 4 — Move selection handlers only

After the state hook works, move the handlers. This keeps ALL/CLEAR safe.

```md
# Move Cluster Selection Handlers Into useClusterSelectionState

## Summary

Extend `useClusterSelectionState.ts` by moving only setup selection handlers from `ClusterAnalysisTab.tsx`.

Do not move API handlers, request state, elbow result state, cluster result state, selectedK, loading flags, or request errors.

## Key Changes

Move existing handlers unchanged:

- toggle entry
- toggle stat
- select visible entries
- clear visible entries
- select visible stats
- clear visible stats
- country filter change, if currently wrapped in a local handler
- stat category filter change, if currently wrapped in a local handler
- max K change, if currently wrapped in a local handler

Keep the same handler names where practical so `ClusterAnalysisTab.tsx` and `ClusterSetupPanel` prop wiring remains mechanical.

## ALL/CLEAR Preservation

Do not change how `SearchableCheckboxPanel` passes currently visible items into ALL/CLEAR handlers.

If the current handlers receive visible items as arguments, preserve that exact signature.

Do not recompute visible/search-filtered lists inside `useClusterSelectionState`.

The hook should receive or expose handlers that operate on the visible values already passed from the UI.

## Strict Preservation Rules

Do not change:

- selected entry behavior
- selected stat behavior
- ALL/CLEAR behavior
- country filter behavior
- stat category filter behavior
- max K behavior
- validation logic
- derived option filtering
- API payload construction
- API calls
- request state
- chart rendering

Do not introduce new state beyond what already exists in `useClusterSelectionState`.

Do not create extra hooks.

## Import Rules

- Use `import type` for TypeScript-only imports.
- Do not import from `ClusterAnalysisTab.tsx`.
- Avoid circular imports.

## Test Plan

Run from `frontend/`:

- `npm run build`
- `npm run lint`

Fix only errors caused by this extraction.
```

---

## Prompt 5 — Extract elbow/cluster request state and API handlers

Only do this after the previous steps pass. This is the riskiest step, but now the file is already smaller.

````md
# Extract useClusterRequests Hook

## Summary

Create `frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts` and move only Elbow/K-Means request state and API handlers from `ClusterAnalysisTab.tsx`.

Keep setup selection state, setup derived data, UI layout, charts, and `useClusterProfiles` outside this hook.

## Key Changes

Move these states into the hook:

- `selectedK`
- `elbowResult`
- `clusterResult`
- elbow loading flag
- cluster loading flag
- `requestError`

Move these handlers unchanged:

- calculate elbow
- run clusters

Move only reset effects that directly reset or prune:

- selectedK
- elbowResult
- clusterResult
- request error
- request loading state

Only move these effects if they currently belong to request/result lifecycle behavior.

## Hook Interface

Add explicit exported params/result types.

The hook should receive the already-derived request inputs:

- `requestPayloadEntries`
- `cleanedSelectedStatKeys`
- `maxK`
- any validation value needed to prevent invalid requests

The hook should return:

- `selectedK`
- `setSelectedK`
- `elbowResult`
- `clusterResult`
- loading flags
- `requestError`
- `handleCalculateElbow`
- `handleRunClusters`
- `kOptions`, if currently derived directly from `elbowResult`

Keep returned variable names the same where practical.

## API Payload Preservation

The elbow request payload must remain exactly:

```ts
{
  teamSeasonEntries,
  statKeys,
  maxK,
}
```
````

The cluster run request payload must remain exactly:

```ts
{
  teamSeasonEntries,
  statKeys,
  k: selectedK,
}
```

Do not change API function imports:

- `calculateTeamClusterElbow`
- `runTeamClusters`

Do not change error handling behavior or displayed error strings.

Reuse existing `getErrorMessage`.

## Strict Preservation Rules

Copy existing request handlers, loading behavior, error behavior, selectedK behavior, and reset effects exactly except for import/export changes required to compile.

Do not:

- change request payload shape
- change validation rules
- change loading behavior
- change selectedK default/reset behavior
- change error messages
- change API calls
- change clustering logic
- change normalization logic
- change UI markup
- move chart rendering
- move `useClusterProfiles`

## Import Rules

- Use `import type` for TypeScript-only imports.
- The hook must not import from `ClusterAnalysisTab.tsx`.
- Avoid circular imports.

## Test Plan

Run from `frontend/`:

- `npm run build`
- `npm run lint`

Fix only errors caused by this extraction.

Also manually inspect the diff to confirm API payload shapes did not change.

````

---

## Prompt 6 — Optional wrapper hook after everything passes

This is optional. You may not need it. Smaller hooks are often cleaner than one huge `useClusterAnalysisState`.

```md
# Optional Compose Cluster Analysis Hooks

## Summary
Optionally create `frontend/src/components/cluster-analysis/hooks/useClusterAnalysisState.ts` as a thin composition wrapper around the existing smaller hooks.

This wrapper must not introduce new behavior. It should only call:
- `useClusterSelectionState`
- `useClusterSetupData`
- `useClusterRequests`

Keep `useClusterProfiles(clusterResult, cleanedSelectedStatKeys)` in `ClusterAnalysisTab.tsx` for now.

## Key Changes
- Create `useClusterAnalysisState.ts`.
- It should accept:
  - `entries`
  - `statKeys`
- It should call the smaller hooks in the same order currently used by `ClusterAnalysisTab.tsx`.
- It should return an explicit object containing the same values currently destructured in `ClusterAnalysisTab.tsx`.
- Update `ClusterAnalysisTab.tsx` to use the wrapper only if doing so makes the file simpler without changing behavior.

## Strict Rules
Do not:
- merge logic from the smaller hooks
- rewrite hook internals
- change dependency arrays
- change state ownership
- change API behavior
- change validation
- change selection behavior
- change result rendering
- move `useClusterProfiles`

This wrapper is only an orchestration layer.

## Test Plan
Run from `frontend/`:
- `npm run build`
- `npm run lint`

Fix only errors caused by this composition step.
````

---

## Final Recommendation

A good final architecture is:

```txt
ClusterAnalysisTab.tsx
  useClusterSelectionState()
  useClusterSetupData()
  useClusterRequests()
  useClusterProfiles()
```

Stop after Prompt 5 unless `ClusterAnalysisTab.tsx` is still too noisy. A wrapper hook is optional and can make things less clear if it simply hides too many values behind one large return object.
