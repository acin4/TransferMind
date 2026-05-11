# Apriori Association Rules Implementation Guide

## 1. Purpose

Apriori Association Rules Mining adds a pattern discovery feature to TransferMind. Instead of grouping similar team-season entries into clusters, it finds repeated stat patterns across selected team-season entries and expresses them as readable rules.

Example output:

```text
possession_high + pass_accuracy_high -> goals_high
```

For a thesis-friendly first version, keep the feature small and explainable:

```text
Backend prepares selected team-stat rows
Backend or Python converts numeric stats into low/medium/high categorical items
Python runs Apriori
Python returns JSON association rules
Frontend renders a rules table and a simple top rules chart
```

Do not start with a network graph. A network graph can be listed as future work after the basic rule mining workflow is stable.

## 2. Why Apriori Is Separate From Cluster Analysis

Apriori is Association Rules Mining, not clustering.

K-means and Agglomerative Clustering answer:

```text
Which selected team-season entries are similar to each other?
```

Apriori answers:

```text
Which stat conditions often appear together?
```

That difference matters for the implementation:

- Clustering uses continuous numeric vectors.
- Apriori uses categorical transactions.
- Clustering returns cluster labels, centroids, profiles, or hierarchy.
- Apriori returns association rules with support, confidence, and lift.
- Apriori should not be mixed into the K-means or Agglomerative result UI.

Keep existing K-means and Agglomerative behavior unchanged. Add Apriori as a separate Association Rules Mining or Pattern Discovery feature.

## 3. Target UX

Recommended final UX:

- A separate page, section, or tab named `Association Rules Mining` or `Pattern Discovery`.
- A team-season selector that reuses existing selection concepts from Team Comparison and Cluster Analysis.
- A statistics selector that reuses existing stat labels and categories where practical.
- Discretization settings:
  - bin count for the first version can be fixed at `low`, `medium`, `high`
  - optional method selector can come later if needed
- Threshold controls:
  - minimum support
  - minimum confidence
  - optional minimum lift
- Results table with:
  - antecedents
  - consequents
  - support
  - confidence
  - lift
- Top rules chart:
  - first version should be a simple bar chart by lift or confidence
- Short explanation of support, confidence, and lift.
- Optional network graph as future work only.

Suggested first-version product behavior:

- User selects team-season entries.
- User selects statistics.
- User selects thresholds:
  - min support
  - min confidence
  - optional min lift
- System converts every selected numeric stat into categorical bins:
  - `low`
  - `medium`
  - `high`
- For stats marked as `direction: "negative"`, use direction-adjusted normalized values before binning so that:
  - `high` always means better/higher-performing
  - `low` always means worse/lower-performing
- Each team-season entry becomes one transaction.
- Python runs Apriori on those transactions.
- Frontend shows a rules table and top rules bar chart.

## 4. Data Flow

Recommended first-version data flow:

```text
Frontend selected team-season entries + selected stat keys + Apriori settings
  -> backend route/controller
  -> backend service reuses team comparison row loading
  -> backend builds team-stat rows or matrix
  -> backend applies deterministic discretization
  -> Python Apriori runner receives transactions
  -> Python returns JSON rules
  -> backend validates and shapes response
  -> frontend renders table, chart, and states
```

Important reuse rule:

Do not duplicate existing team/stat loading logic. The backend already knows how to load team comparison rows and build team-stat matrices. Apriori should use the same source data and metadata, then branch into categorical transaction generation.

## 5. Discretization Strategy

Apriori requires transactions made of categorical items. Continuous football stats must be discretized before mining.

Numeric examples:

```text
goals = 2.1           -> goals_high
possession = 54.2     -> possession_medium
fouls = 15.0          -> fouls_low, if fouls is negative-direction and direction-adjusted
```

### Option A: Backend discretizes stats and sends transactions to Python

Pros:

- Keeps request validation, stat metadata, labels, direction handling, and row shaping in the Node service layer.
- Python runner stays small and focused on Apriori.
- Easier to unit test transactions without depending on Python internals.
- Better match for TransferMind's existing backend service architecture.

Cons:

- Node service must include binning logic.
- If future Python experiments need different binning methods, the backend contract must expand.

### Option B: Python receives numeric matrix and discretizes internally

Pros:

- Keeps Apriori-specific data preparation near the Apriori algorithm.
- Easier to experiment with Python data-mining libraries.

Cons:

- Duplicates metadata/direction decisions outside the backend service layer.
- Makes backend tests less direct.
- Increases risk of drifting from existing TransferMind stat handling.

### Recommendation

Use Option A for this project: backend discretizes and sends categorical transactions to Python.

TransferMind already centralizes team-stat loading, stat metadata, and negative-direction handling in the backend. Keeping discretization there makes the first version deterministic, easier to review, and easier to explain in the thesis. Python should receive a clean list of transactions and return association rules.

### Direction Handling

Use the same numeric preparation principles as clustering where they apply:

- rows = selected team-season entries
- columns = selected statistics
- missing/invalid values are treated as `0`
- values are min-max normalized from `0` to `1`
- stats marked as `direction: "negative"` are inverted after normalization

For Apriori, use the direction-adjusted normalized value for binning:

```text
0.00 <= value < 0.33 -> low
0.33 <= value < 0.67 -> medium
0.67 <= value <= 1.00 -> high
```

After direction adjustment, item labels are performance-oriented:

- `goals_high` means high goals performance.
- `fouls_high` means better foul performance if fouls are negative-direction, because the normalized value was inverted first.
- `fouls_low` means worse foul performance after direction adjustment.

This should be documented in UI copy or tooltip text because it is important for thesis interpretation.

## 6. Association Rule Metrics

Use simple wording throughout the app and thesis:

- Support: how often the full rule appears in all selected team-season entries.
- Confidence: how often the consequent appears when the antecedent appears.
- Lift: how much stronger the rule is than random co-occurrence. Values above `1` suggest a positive association.

Example:

```text
possession_high + pass_accuracy_high -> goals_high
support: 0.24
confidence: 0.75
lift: 1.40
```

Plain-English interpretation:

```text
Among the selected team-season entries, high possession and high pass accuracy often appear together with high goals. The confidence says this happened in 75% of entries where the antecedent was present. The lift above 1 suggests the relationship is stronger than random co-occurrence.
```

## 7. Implementation Strategy

Recommended approach:

1. Audit existing Team Comparison and Cluster Analysis data-loading code.
2. Define Apriori request and response contracts.
3. Add deterministic backend discretization into transactions.
4. Add a Python Apriori runner that accepts transactions as JSON through stdin and writes JSON to stdout.
5. Add a backend Python client wrapper.
6. Add a backend route/controller/service endpoint.
7. Add a separate frontend Association Rules Mining page, section, or tab.
8. Render table, chart, validation, loading, empty, and error states.

Use a first-version endpoint such as:

```text
POST /api/team-season-stats/association-rules
```

or, if the existing backend route naming strongly suggests another pattern, follow the local convention. Keep the public contract based on internal database ids, not external football API ids.

Potential request shape:

```json
{
  "entries": [
    { "teamId": 1, "seasonId": 10, "tournamentId": 100 }
  ],
  "statKeys": ["goals", "possession", "fouls"],
  "minSupport": 0.2,
  "minConfidence": 0.6,
  "minLift": 1
}
```

Potential response shape:

```json
{
  "data": {
    "rules": [
      {
        "antecedents": ["possession_high", "pass_accuracy_high"],
        "consequents": ["goals_high"],
        "support": 0.24,
        "confidence": 0.75,
        "lift": 1.4
      }
    ],
    "transactions": {
      "count": 25,
      "itemCount": 42
    },
    "settings": {
      "minSupport": 0.2,
      "minConfidence": 0.6,
      "minLift": 1,
      "bins": ["low", "medium", "high"]
    },
    "warnings": []
  }
}
```

Safe validation rules:

- Require at least a minimum number of selected team-season entries. A practical first value is `5`.
- Require at least a minimum number of selected stats. A practical first value is `2`.
- `minSupport` must be greater than `0` and less than or equal to `1`.
- `minConfidence` must be greater than `0` and less than or equal to `1`.
- `minLift` is optional. If provided, it must be positive.
- No rules found is a valid empty result, not an error.

## 8. Step-by-Step Plan

### Step 1: Audit reusable team/stat selection and data-loading code

Goal:

Identify the existing frontend and backend pieces that can be reused for Apriori without changing Cluster Analysis or Team Comparison behavior.

Files likely affected:

- Documentation only, or no files
- Read `frontend/src/pages/TeamsComparison.tsx`
- Read `frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx`
- Read `frontend/src/components/teams-comparison/CustomComparisonTab.tsx`
- Read `frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts`
- Read `frontend/src/api/api.ts`
- Read `backend/services/teamClusteringService.js`
- Read `backend/controllers/teamController.js`
- Read `backend/api/routes.js`
- Read `backend/repositories/teamRepository.js`
- Read `backend/lib/teamStatsMetadata.js`

What to change:

- Do not change runtime behavior.
- Map how selected team-season entries and selected stat keys are represented.
- Map how backend comparison rows and normalized matrices are built.
- Note reusable metadata labels/categories.
- Note where Apriori should branch into a separate feature.

Acceptance criteria:

- Existing selection and data-loading flow is understood.
- No K-means or Agglomerative behavior changes.
- No unrelated files edited.

```text
Codex prompt:
Audit the current TransferMind team/stat selection and team-stat data-loading flow before adding Apriori Association Rules Mining.

Inspect before editing:
- frontend/src/pages/TeamsComparison.tsx
- frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx
- frontend/src/components/teams-comparison/CustomComparisonTab.tsx
- frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts
- frontend/src/api/api.ts
- backend/services/teamClusteringService.js
- backend/controllers/teamController.js
- backend/api/routes.js
- backend/repositories/teamRepository.js
- backend/lib/teamStatsMetadata.js

Do not change runtime behavior.
Do not change K-means or Agglomerative behavior.
Do not create frontend Supabase access.
Do not expose external api_id values.

Produce a concise architecture map covering:
- selected team-season entry shape
- selected stat key flow
- backend route -> controller -> service -> repository flow for team comparison or clustering data
- matrix-building or row-building helpers that Apriori can reuse
- metadata labels/categories available for display
- safest place to add a separate Association Rules Mining feature

Run git diff after the audit and show the diff.
Avoid unrelated refactors.
```

### Step 2: Define the Apriori request/response contracts

Goal:

Define stable TypeScript and backend contracts before implementation.

Files likely affected:

- `frontend/src/api/api.ts`
- Possibly `frontend/src/components/association-rules/types.ts`
- Possibly backend controller/service files after the endpoint exists
- Optional docs note if contract is documented separately

What to change:

- Add explicit request and response types.
- Use internal database ids in request values.
- Include thresholds and discretization settings.
- Use `{ data: ... }` response envelope if that matches existing backend patterns.
- Avoid broad `any`.

Acceptance criteria:

- Contract is typed.
- Contract does not leak external `api_id` values.
- Empty rules can be represented as `rules: []`.
- Contract includes support, confidence, and lift.

```text
Codex prompt:
Define the first-version Apriori Association Rules Mining request and response contracts for TransferMind.

Inspect before editing:
- frontend/src/api/api.ts
- frontend/src/components/cluster-analysis/types.ts
- backend/controllers/teamController.js
- backend/services/teamClusteringService.js
- backend/lib/http.js

Make minimal changes.
Keep existing K-means and Agglomerative behavior unchanged.
Use internal database ids only in public request/response contracts.
Avoid broad any.

Add or prepare typed contracts for:
- selected team-season entries
- selected stat keys
- minSupport
- minConfidence
- optional minLift
- discretization bins/settings
- returned association rules with antecedents, consequents, support, confidence, and lift
- warnings and empty rules

Do not implement the full endpoint yet unless the repository structure makes a small placeholder necessary.
Run frontend type checks or build only if relevant.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 3: Decide and implement the discretization strategy

Goal:

Add deterministic conversion from numeric stats to categorical Apriori items.

Files likely affected:

- `backend/services/teamAssociationRulesService.js`
- Or a shared backend helper such as `backend/services/teamStatDiscretization.js`
- `backend/lib/teamStatsMetadata.js`
- Backend tests or a small syntax-checkable helper test if the project has a pattern

What to change:

- Implement backend discretization.
- Reuse existing stat metadata for labels and `direction`.
- Treat missing/invalid numeric values as `0`.
- Min-max normalize selected stat values across selected rows.
- Invert negative-direction stats after normalization.
- Bin direction-adjusted values into `low`, `medium`, and `high`.
- Generate item keys like `goals_high`.
- Optionally include display labels like `Goals high`.

Acceptance criteria:

- Same input rows always produce same transactions.
- Negative-direction stats use performance-oriented bins.
- No old migrations or database schema changed.
- No clustering behavior changed.

```text
Codex prompt:
Implement deterministic backend discretization for Apriori transactions.

Inspect before editing:
- backend/services/teamClusteringService.js
- backend/lib/teamStatsMetadata.js
- backend/repositories/teamRepository.js

Make minimal changes and prefer a new focused helper/service if that avoids touching clustering behavior.
Do not rewrite Cluster Analysis.
Do not change K-means or Agglomerative behavior.
Do not edit database migrations.

Implement logic that:
- accepts selected team-season rows and selected stat keys
- treats missing/invalid values as 0
- min-max normalizes each selected stat from 0 to 1
- inverts stats marked direction: "negative" after normalization
- bins adjusted values into low, medium, high
- returns one transaction per team-season entry
- uses item keys like goals_high and possession_medium
- preserves enough row metadata for warnings/debugging without exposing external api_id values

Add focused tests if the repository has a backend test pattern; otherwise add a small syntax-checkable helper and manually verify with a sample.
Run an appropriate syntax check or test.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 4: Add backend service for building Apriori input

Goal:

Create the service layer that loads selected team-stat rows and builds Apriori transactions.

Files likely affected:

- `backend/services/teamAssociationRulesService.js`
- `backend/repositories/teamRepository.js` only if an existing repository method cannot load the needed rows
- `backend/lib/teamStatsMetadata.js`

What to change:

- Add a service that validates selected entries and selected stats.
- Reuse existing repository/data-loading logic for team comparison rows.
- Build transactions through the discretization helper.
- Return transactions, warnings, and settings for the Python runner.
- Keep all Supabase access in repositories.

Acceptance criteria:

- Service follows route -> controller -> service -> repository architecture.
- Service does not query Supabase directly unless that is already the established local pattern for this exact service layer.
- Service does not leak external API ids.
- Service can return a valid empty-rules-ready dataset.

```text
Codex prompt:
Add a backend service for preparing Apriori Association Rules input.

Inspect before editing:
- backend/services/teamClusteringService.js
- backend/repositories/teamRepository.js
- backend/controllers/teamController.js
- backend/lib/http.js
- backend/lib/teamStatsMetadata.js

Make minimal changes.
Keep existing Team Comparison, K-means, and Agglomerative behavior unchanged.
Do not duplicate team/stat loading logic if an existing repository or service helper can be reused.
Do not create frontend Supabase access.
Do not expose external api_id values.

Implement a service that:
- validates minimum selected team-season entries
- validates minimum selected stats
- validates selected stat keys against available metadata or existing accepted stats
- loads the selected team-stat rows through the existing backend/repository flow
- builds categorical transactions using the discretization helper
- returns transactions, settings, row count, item count, and warnings

Run an appropriate backend syntax check or focused test.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 5: Add Python Apriori script

Goal:

Add a small Python runner that receives transactions and thresholds, runs Apriori, and returns JSON rules.

Files likely affected:

- `backend/python/apriori_runner.py`
- `backend/python/requirements.txt`
- Possibly `backend/requirements.txt`, depending on current dependency conventions

What to change:

- Implement stdin JSON input and stdout JSON output.
- Use a simple, deterministic Apriori implementation.
- Prefer a small in-repo implementation first if adding dependencies would complicate setup.
- If using a library such as `mlxtend`, update Python requirements and document it.
- Sort returned rules deterministically, such as by lift descending, confidence descending, support descending, then lexical rule text.
- Treat no rules found as `rules: []`.

Acceptance criteria:

- Script can run independently with sample JSON.
- Invalid input returns a clear JSON error or non-zero exit handled by Node.
- Output includes antecedents, consequents, support, confidence, and lift.
- No network calls.

```text
Codex prompt:
Add a Python Apriori runner for TransferMind Association Rules Mining.

Inspect before editing:
- backend/python/kmeans_runner.py
- backend/python/requirements.txt
- backend/requirements.txt
- backend/lib/pythonKMeansClient.js

Make minimal changes.
Do not change the K-means Python runner.
Do not add DBSCAN or clustering behavior.
Prefer a simple deterministic implementation that reads JSON from stdin and writes JSON to stdout.

Implement backend/python/apriori_runner.py so it accepts:
- transactions: array of arrays of item strings
- minSupport
- minConfidence
- optional minLift

Return JSON with:
- rules: array of antecedents, consequents, support, confidence, lift
- warnings: array

Sort rules deterministically by lift descending, confidence descending, support descending, then rule text.
Handle no rules found as rules: [].
Add or update Python requirements only if a dependency is truly needed.

Run the script with a small sample input.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 6: Add backend Python client wrapper

Goal:

Allow Node/Express to call the Python Apriori script safely and consistently.

Files likely affected:

- `backend/lib/pythonAprioriClient.js`
- `backend/services/teamAssociationRulesService.js`
- Possibly `backend/lib/pythonKMeansClient.js` only if a shared process helper already exists or is clearly worth extracting

What to change:

- Add a wrapper that spawns Python with JSON stdin.
- Parse JSON stdout.
- Convert script failures into backend-friendly errors.
- Set reasonable timeout behavior if existing Python client patterns do.
- Keep K-means wrapper behavior unchanged.

Acceptance criteria:

- Backend can call Apriori runner with prepared transactions.
- Python errors do not crash the server process.
- The wrapper returns typed/validated rules to the service.

```text
Codex prompt:
Add a backend Python client wrapper for the Apriori runner.

Inspect before editing:
- backend/lib/pythonKMeansClient.js
- backend/python/kmeans_runner.py
- backend/python/apriori_runner.py
- backend/services/teamAssociationRulesService.js
- backend/lib/http.js

Make minimal changes.
Do not change K-means wrapper behavior unless extracting a tiny shared helper is clearly safe.
Do not modify clustering results or endpoints.

Implement a wrapper that:
- sends transactions and thresholds to backend/python/apriori_runner.py as JSON stdin
- parses JSON stdout
- validates that rules is an array
- returns warnings
- handles Python process errors with clear backend errors

Run a focused backend syntax check or a small Node invocation if practical.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 7: Add API route/controller for Association Rules Mining

Goal:

Expose Apriori through a backend API endpoint without changing existing comparison or clustering endpoints.

Files likely affected:

- `backend/api/routes.js`
- `backend/controllers/teamController.js` or a new focused controller if that matches local patterns
- `backend/services/teamAssociationRulesService.js`
- `backend/lib/http.js`
- `backend/postman/TransferMind API.postman_collection.json`
- `backend/postman/README.md`

What to change:

- Add a POST endpoint for association rules.
- Parse and validate request values in the controller.
- Call the service.
- Return `{ data: ... }` where consistent with existing API style.
- Update Postman docs if the endpoint is part of the public API contract.

Acceptance criteria:

- Endpoint returns rules for valid input.
- Endpoint returns validation errors for invalid thresholds or insufficient selections.
- Empty rules returns `200` with `rules: []`.
- Existing endpoints still work.

```text
Codex prompt:
Add the backend API endpoint for Apriori Association Rules Mining.

Inspect before editing:
- backend/api/routes.js
- backend/controllers/teamController.js
- backend/services/teamAssociationRulesService.js
- backend/lib/http.js
- backend/postman/TransferMind API.postman_collection.json
- backend/postman/README.md

Make minimal changes.
Keep existing Team Comparison, K-means, and Agglomerative endpoints unchanged.
Use internal database ids only.
Use the existing HTTP helper and response envelope conventions.

Add a POST endpoint such as:
POST /api/team-season-stats/association-rules

The controller should:
- parse selected entries
- parse selected stat keys
- parse minSupport, minConfidence, optional minLift
- reject invalid thresholds
- call the association rules service
- return { data: ... }

Update Postman docs/collection if this repository treats them as public API docs.
Run backend syntax checks or endpoint smoke checks where practical.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 8: Add frontend page/section/tab for Apriori

Goal:

Create a separate Association Rules Mining or Pattern Discovery UI surface.

Files likely affected:

- `frontend/src/pages/TeamsComparison.tsx`
- `frontend/src/components/teams-comparison/AssociationRulesTab.tsx`
- `frontend/src/components/association-rules/` if creating a dedicated folder
- `frontend/src/api/api.ts`
- Existing tab UI components

What to change:

- Add a separate tab/section instead of mixing Apriori into Cluster Analysis results.
- Reuse selected team-season entries and selected statistic keys where practical.
- Preserve Custom Comparison and Cluster Analysis.
- Do not remove or rewrite K-means/Agglomerative UI.

Acceptance criteria:

- User can navigate to Association Rules Mining or Pattern Discovery.
- Existing Custom Comparison and Cluster Analysis still render.
- Apriori UI starts with controls and empty state.
- No frontend Supabase access added.

```text
Codex prompt:
Add a separate frontend UI surface for Apriori Association Rules Mining.

Inspect before editing:
- frontend/src/pages/TeamsComparison.tsx
- frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx
- frontend/src/components/teams-comparison/CustomComparisonTab.tsx
- frontend/src/components/ui/SegmentedTabs.tsx
- frontend/src/api/api.ts

Make minimal changes.
Do not remove or rewrite Custom Comparison.
Do not remove or rewrite Cluster Analysis.
Do not mix Apriori into K-means or Agglomerative result UI.
Do not create frontend Supabase access.

Add a separate page section or tab named Association Rules Mining or Pattern Discovery.
Reuse existing selected team-season entries and selected stat keys where practical.
Create a placeholder/empty state and wire the basic API function if the backend endpoint exists.

Run npm run lint and npm run build from frontend/ if relevant.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 9: Add discretization and threshold controls

Goal:

Let users configure Apriori thresholds and understand the fixed low/medium/high binning.

Files likely affected:

- `frontend/src/components/teams-comparison/AssociationRulesTab.tsx`
- `frontend/src/components/association-rules/AssociationRulesControls.tsx`
- `frontend/src/api/api.ts`

What to change:

- Add inputs for `minSupport`, `minConfidence`, and optional `minLift`.
- Use clear numeric validation.
- Show discretization as fixed `low / medium / high` in the first version.
- Include brief metric/discretization explanation.

Acceptance criteria:

- Controls prevent obviously invalid requests.
- `minSupport` and `minConfidence` are between `0` and `1`.
- `minLift` is optional and positive when provided.
- Fixed bins are visible but not overbuilt.

```text
Codex prompt:
Add Apriori discretization and threshold controls to the Association Rules Mining UI.

Inspect before editing:
- frontend/src/components/teams-comparison/AssociationRulesTab.tsx
- frontend/src/api/api.ts
- frontend/src/components/cluster-analysis/components/SelectField.tsx
- frontend/src/components/cluster-analysis/components/MessageBox.tsx

Make minimal changes.
Keep Cluster Analysis controls unchanged.
Do not add a network graph.
Do not add complex discretization methods yet.

Add controls for:
- minSupport between 0 and 1
- minConfidence between 0 and 1
- optional minLift greater than 0

Show that the first version uses fixed low, medium, high bins.
Explain that negative-direction stats are direction-adjusted before binning so high means better performance.
Disable or validate the run button when selected entries, selected stats, or thresholds are invalid.

Run npm run lint and npm run build from frontend/ if relevant.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 10: Render association rules table

Goal:

Show Apriori results in a readable table.

Files likely affected:

- `frontend/src/components/teams-comparison/AssociationRulesTab.tsx`
- `frontend/src/components/association-rules/AssociationRulesTable.tsx`
- `frontend/src/api/api.ts`

What to change:

- Render antecedents and consequents as item lists.
- Render support, confidence, and lift with consistent formatting.
- Use stat labels/categories where practical, while keeping raw item keys available if labels are missing.
- Preserve empty state for no rules.

Acceptance criteria:

- Rules table renders valid API response.
- No-rules result is shown as a valid empty result.
- Metric values are legible and sorted consistently with backend output.

```text
Codex prompt:
Render Apriori association rules in a frontend results table.

Inspect before editing:
- frontend/src/components/teams-comparison/AssociationRulesTab.tsx
- frontend/src/teamStatsConfig.ts
- frontend/src/utils/statCategories.ts
- frontend/src/api/api.ts

Make minimal changes.
Do not change Cluster Analysis rendering.
Do not mix rules into K-means or Agglomerative components.
Avoid broad any.

Add a rules table that shows:
- antecedents
- consequents
- support
- confidence
- lift

Use existing stat labels/categories where practical.
Handle unknown item keys gracefully.
Handle rules: [] as an empty result, not an error.

Run npm run lint and npm run build from frontend/ if relevant.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 11: Add top rules chart by lift/confidence

Goal:

Add a simple visual summary of the strongest rules.

Files likely affected:

- `frontend/src/components/association-rules/TopRulesChart.tsx`
- `frontend/src/components/teams-comparison/AssociationRulesTab.tsx`
- Existing chart utilities/components if available

What to change:

- Add a simple bar chart for top rules.
- Default ranking can be by lift.
- Allow confidence ranking only if it is easy and does not expand scope.
- Keep the chart readable for long rule labels.

Acceptance criteria:

- Top rules chart renders for non-empty results.
- Chart does not overlap or break at common desktop/mobile widths.
- No network graph is added.

```text
Codex prompt:
Add a simple top rules bar chart to the Association Rules Mining UI.

Inspect before editing:
- frontend/src/components/teams-comparison/AssociationRulesTab.tsx
- frontend/src/components/cluster-analysis/components/ClusterAverageProfilesChart.tsx
- frontend/src/components/cluster-analysis/utils/clusterChartUtils.ts
- frontend/package.json

Make minimal changes.
Do not add a network graph.
Do not change Cluster Analysis charts.
Reuse the existing charting approach if one is already used in the project.

Render the top association rules as a bar chart:
- default metric: lift
- show confidence/support in tooltip or compact labels if practical
- keep long rule labels readable
- hide the chart for rules: [] and show the empty state instead

Run npm run lint and npm run build from frontend/.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 12: Add empty/loading/error states

Goal:

Make the Apriori workflow robust and pleasant to use.

Files likely affected:

- `frontend/src/components/teams-comparison/AssociationRulesTab.tsx`
- `frontend/src/components/association-rules/`
- `frontend/src/api/api.ts`
- Backend controller/service validation if gaps are found

What to change:

- Add loading state while the request is running.
- Add validation messages before request.
- Add empty result state for no rules found.
- Add error state for backend/Python failures.
- Preserve previous results only if that matches local UX patterns.

Acceptance criteria:

- Invalid selections do not fire requests.
- No rules found is displayed calmly as a valid result.
- Backend errors show useful text without exposing stack traces.

```text
Codex prompt:
Add complete empty, loading, validation, and error states for Association Rules Mining.

Inspect before editing:
- frontend/src/components/teams-comparison/AssociationRulesTab.tsx
- frontend/src/components/cluster-analysis/components/MessageBox.tsx
- frontend/src/api/api.ts
- backend/controllers/teamController.js
- backend/services/teamAssociationRulesService.js

Make minimal changes.
Do not change existing Cluster Analysis states.
Do not expose backend stack traces in the UI.

Add states for:
- not enough selected team-season entries
- not enough selected stats
- invalid minSupport/minConfidence/minLift
- loading request
- no rules found
- backend/Python error
- successful rules response

Run npm run lint and npm run build from frontend/ if frontend changed.
Run backend syntax checks if backend changed.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 13: Add validation and manual tests

Goal:

Verify the full API and UI flow without broad refactors.

Files likely affected:

- Backend service/controller tests if the project has a pattern
- Frontend tests only if existing test infrastructure supports it
- `backend/postman/README.md`
- Documentation notes

What to change:

- Add focused validation tests if practical.
- Add manual test instructions if automated tests are not available.
- Confirm frontend build and backend smoke checks.

Acceptance criteria:

- Invalid thresholds are rejected.
- Insufficient selections are rejected.
- No rules found returns a successful empty result.
- A sample valid selection returns rules or a valid empty result.
- Existing Cluster Analysis still works.

```text
Codex prompt:
Add focused validation and manual tests for Apriori Association Rules Mining.

Inspect before editing:
- backend/package.json
- backend/controllers/teamController.js
- backend/services/teamAssociationRulesService.js
- backend/postman/README.md
- frontend/package.json
- frontend/src/components/teams-comparison/AssociationRulesTab.tsx

Make minimal changes.
Do not add a broad new test framework.
Do not alter K-means or Agglomerative behavior.

Add focused tests or documented manual checks for:
- invalid minSupport
- invalid minConfidence
- invalid optional minLift
- too few selected team-season entries
- too few selected stats
- no rules found returns rules: []
- valid sample request reaches Python and returns JSON

Run relevant backend checks.
Run npm run lint and npm run build from frontend/ if frontend changed.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 14: Final cleanup and thesis explanation text

Goal:

Polish the feature and add simple thesis-friendly explanation copy without expanding scope.

Files likely affected:

- `frontend/src/components/teams-comparison/AssociationRulesTab.tsx`
- `docs/`
- Possibly `backend/postman/README.md`

What to change:

- Add concise explanation text for Apriori, discretization, support, confidence, and lift.
- Confirm no network graph was added.
- Confirm Cluster Analysis behavior is unchanged.
- Remove temporary debug output.
- Make sure labels are understandable.

Acceptance criteria:

- Feature is understandable to a thesis reviewer.
- UI copy clearly says Apriori is Association Rules Mining / Pattern Discovery.
- No scope creep added.
- Git diff is focused.

```text
Codex prompt:
Perform final cleanup for the Apriori Association Rules Mining feature and add thesis-friendly explanation text.

Inspect before editing:
- frontend/src/components/teams-comparison/AssociationRulesTab.tsx
- docs/
- backend/postman/README.md
- git diff

Make minimal changes.
Do not add a network graph.
Do not rewrite Cluster Analysis.
Do not change K-means or Agglomerative behavior.
Do not edit database migrations.

Add or refine concise copy explaining:
- Apriori is Association Rules Mining, not clustering
- numeric football stats are converted into low/medium/high items
- negative-direction stats are direction-adjusted so high means better performance
- support, confidence, and lift
- no rules found is a valid outcome

Remove temporary debug logs.
Run frontend lint/build and backend checks relevant to changed files.
Run git status --short and git diff.
Show the final diff summary.
Avoid unrelated refactors.
```

## 9. Testing Instructions After Each Major Phase

### Phase A: Backend Preparation and Discretization

Run after Steps 1 to 4:

```bash
cd backend
npm run test:api
```

Before relying on `npm run test:api`, verify that `backend/api/fetchTest.js` exists because the project notes say the script may reference that file.

If no backend automated test fits the change, run a syntax/import smoke check for the changed service files and manually inspect the generated transactions with a small selected dataset.

Check:

- Missing/invalid values become `0`.
- Normalized values stay between `0` and `1`.
- Negative-direction stats are inverted before binning.
- Transactions contain only categorical item strings.
- No external `api_id` values are exposed in public response objects.

### Phase B: Python Runner

Run after Steps 5 and 6:

```bash
cd backend
python3 python/apriori_runner.py
```

Use a small stdin sample:

```json
{
  "transactions": [
    ["possession_high", "pass_accuracy_high", "goals_high"],
    ["possession_high", "pass_accuracy_high"],
    ["possession_low", "fouls_low"],
    ["possession_high", "goals_high"]
  ],
  "minSupport": 0.25,
  "minConfidence": 0.5,
  "minLift": 1
}
```

Check:

- Output is valid JSON.
- Rules contain antecedents, consequents, support, confidence, and lift.
- Sorting is deterministic.
- No rules found returns `rules: []`.

### Phase C: Backend API

Run after Step 7:

```bash
cd backend
npm start
```

Smoke-check:

```text
GET /health
POST /api/team-season-stats/association-rules
```

Check:

- Valid requests return `200` and `{ data: ... }`.
- Invalid thresholds return a validation error.
- Insufficient selected entries/stats return a validation error.
- Empty rules return `200` with `rules: []`.
- Existing comparison and clustering endpoints still respond.

### Phase D: Frontend UI

Run after Steps 8 to 12:

```bash
cd frontend
npm run lint
npm run build
npm run dev
```

Check:

- Association Rules Mining or Pattern Discovery appears separately from Cluster Analysis.
- Custom Comparison still renders.
- Cluster Analysis still renders.
- Threshold controls validate input.
- Rules table renders returned rules.
- Top rules chart renders returned rules.
- Empty/loading/error states are clear.

### Phase E: Final Integration

Run after Steps 13 and 14:

```bash
git status --short
git diff
```

Then run the relevant frontend and backend checks for all changed files.

Check:

- Diff is focused.
- No old migrations were edited.
- No `.env` files or secrets were added.
- No frontend Supabase client was introduced.
- No new reliance on `key_passes` was added.
- No DBSCAN or network graph work slipped into the first version.

## 10. Final Manual Test Checklist

- Open the Teams Comparison area.
- Confirm Custom Comparison still works.
- Confirm Cluster Analysis still works with existing K-means behavior.
- If Agglomerative exists, confirm its behavior is unchanged.
- Open Association Rules Mining or Pattern Discovery.
- Select at least the minimum number of team-season entries.
- Select at least the minimum number of statistics.
- Set `minSupport` to a valid value such as `0.2`.
- Set `minConfidence` to a valid value such as `0.6`.
- Leave `minLift` empty and run.
- Set `minLift` to `1` and run again.
- Confirm the request uses internal ids, not external API ids.
- Confirm results show antecedents, consequents, support, confidence, and lift.
- Confirm the top rules chart appears when rules exist.
- Confirm no-rules result is displayed as a valid empty state.
- Try invalid `minSupport` values like `0`, `-0.1`, and `1.5`.
- Try invalid `minConfidence` values like `0`, `-0.1`, and `1.5`.
- Try invalid `minLift` values like `0` and `-1`.
- Try too few selected team-season entries.
- Try too few selected stats.
- Confirm errors do not expose stack traces.
- Confirm no database schema changes were required.

## 11. Do Not Do

- Do not treat Apriori as a clustering algorithm.
- Do not add Apriori into the K-means/Agglomerative result UI.
- Do not rewrite Cluster Analysis.
- Do not change existing K-means behavior.
- Do not change existing Agglomerative behavior if it exists or is in progress.
- Do not add DBSCAN.
- Do not start with a network graph.
- Do not edit old applied migrations.
- Do not change the database schema unless absolutely necessary.
- Do not create Supabase clients in frontend code.
- Do not expose external football API ids in frontend routes or public API contracts.
- Do not duplicate team/stat loading logic.
- Do not add broad `any` types.
- Do not reintroduce or rely on `key_passes`.
- Do not add broad bulk ingestion or external football API fetching for this feature.
- Do not add unrelated refactors, formatting churn, or visual redesigns.

## 12. Thesis Explanation

Apriori Association Rules Mining is used to discover repeated performance patterns in selected football team-season data.

The original statistics are numeric, but Apriori works with categories. Therefore, TransferMind first converts each selected statistic into a simple categorical item. For example, a normalized attacking statistic can become `goals_high`, while a defensive or negative-direction statistic is adjusted so that `high` still means better performance.

Each selected team-season entry becomes one transaction. A transaction is the set of categorical stat items for that team-season entry.

Apriori then searches these transactions for rules of the form:

```text
condition items -> result items
```

For example:

```text
possession_high + pass_accuracy_high -> goals_high
```

This means that, in the selected dataset, high possession and high pass accuracy often appear together with high goals performance.

The three main metrics are:

- Support: how common the full rule is in the selected data.
- Confidence: how often the result appears when the condition appears.
- Lift: whether the relationship is stronger than random co-occurrence.

This feature complements clustering but does not replace it. Clustering groups similar team-season entries. Apriori explains recurring combinations of stat categories across the selected team-season entries.

The first TransferMind version should focus on a rules table and top rules chart. This is enough to demonstrate the method clearly in the thesis while keeping the implementation deterministic, testable, and separate from Cluster Analysis.
