# Agglomerative Clustering Implementation Guide

## 1. Purpose

Agglomerative Clustering adds a hierarchical clustering option to TransferMind's existing Cluster Analysis feature. K-means groups selected team-season entries into a fixed number of clusters. Agglomerative Clustering builds a merge hierarchy, so users can inspect how similar team-season entries combine step by step.

For this thesis project, Agglomerative should be added as a second algorithm option. It must reuse the same selected team-season entries, selected statistic keys, sanitized numeric values, min-max normalization, and negative-stat direction inversion already used by K-means.

The best-practice visualization is a dendrogram. For a thesis deadline, the fastest safe first version is:

```text
Backend prepares normalized matrix once
Python runs Agglomerative on that normalized matrix
Python returns cluster labels plus a static dendrogram image
Frontend renders the image plus a cluster assignment table/list
```

This keeps the implementation clean, reviewable, and avoids building a custom dendrogram renderer in React before the clustering behavior is proven.

## 2. Target UX

Recommended final UX:

- Add an algorithm selector in Cluster Analysis with `K-means` and `Agglomerative`.
- Keep the current K-means flow unchanged: elbow method, final K selection, K-means results, average profiles, parallel coordinates, and membership summary.
- When `Agglomerative` is selected, show controls for the number of clusters and linkage method if the first version can support it safely.
- Render an Agglomerative result area with:
  - a dendrogram, preferably as an SVG/PNG image returned by Python for the first version
  - a cluster assignment list/table for each selected team-season entry
  - warning messages from the backend
  - short explanation text saying the dendrogram shows hierarchical merge distance and the assignments are produced by cutting the hierarchy into the selected cluster count

Suggested copy:

```text
Agglomerative Clustering builds a hierarchy from the same normalized 0-1 team-stat matrix used by K-means. The dendrogram shows which team-season entries merge first and at what distance. Cluster labels come from cutting that hierarchy into the selected number of groups.
```

## 3. Data Flow

Keep the existing clustering flow and extend it:

```text
Frontend selected team-season entries + selected stat keys
  -> backend route/controller
  -> team clustering service
  -> shared normalized matrix preparation
  -> Python clustering runner
  -> backend response shaping
  -> frontend result rendering
```

The normalized matrix rules must stay centralized:

- rows = selected team-season entries
- columns = selected statistics
- values = sanitized numeric values
- missing/invalid values = `0`
- values are min-max normalized from `0` to `1`
- stats marked as negative direction are inverted after normalization

Current important files:

- `backend/services/teamClusteringService.js`
- `backend/lib/pythonKMeansClient.js`
- `backend/python/kmeans_runner.py`
- `backend/controllers/teamController.js`
- `backend/api/routes.js`
- `frontend/src/api/api.ts`
- `frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx`
- `frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts`
- `frontend/src/components/cluster-analysis/components/ElbowMethodPanel.tsx`
- `frontend/src/components/cluster-analysis/components/ClusterSetupPanel.tsx`
- `frontend/src/components/cluster-analysis/components/ClusterMembershipSummary.tsx`
- `frontend/src/components/cluster-analysis/types.ts`

## 4. Implementation Strategy

Recommended approach:

1. Confirm or extract shared normalized matrix preparation in the backend service.
2. Add an algorithm field to request/response contracts without changing K-means defaults.
3. Add a Python Agglomerative runner that accepts normalized points from Node.
4. Return JSON cluster assignments and a dendrogram image string from Python.
5. Add a small backend wrapper for the Agglomerative runner.
6. Add frontend algorithm selection and result rendering.
7. Keep K-means UI, endpoints, and behavior stable.

### Dendrogram Output Options

Option A: Python returns graph-ready dendrogram JSON.

- Pros: React can render a responsive, theme-matched SVG; no image encoding.
- Cons: More frontend work; harder to validate quickly; custom dendrogram layout can become a side project.
- Best for: a later polished version after the thesis result is already working.

Option B: Python returns a static SVG or PNG dendrogram.

- Pros: fastest; SciPy/Matplotlib can generate a correct dendrogram; less React chart code; easier to test manually.
- Cons: less interactive; styling is less integrated with the app.
- Best for: the first thesis-safe implementation.

Recommendation: use Option B first. Prefer SVG text if practical, returned as either:

```json
{
  "dendrogramSvg": "<svg ...>...</svg>"
}
```

or as a data URL:

```json
{
  "dendrogramImage": "data:image/png;base64,..."
}
```

If SVG serialization is awkward, use PNG base64 from Python. The frontend can render it with a normal `<img>` and still show cluster assignments as typed JSON.

## 5. Step-by-Step Plan

### Step 1: Audit the current Cluster Analysis architecture

Goal:

Document exactly how the current K-means flow works before making any changes.

Files likely affected:

- Documentation only, preferably a temporary note under `docs/` or no file changes
- Read `backend/services/teamClusteringService.js`
- Read `backend/lib/pythonKMeansClient.js`
- Read `backend/python/kmeans_runner.py`
- Read `frontend/src/api/api.ts`
- Read `frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx`
- Read `frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts`
- Read `frontend/src/components/cluster-analysis/components/ElbowMethodPanel.tsx`

What to change:

- Do not change implementation files.
- Identify current request payloads, response shapes, matrix-building functions, and result render points.
- Note where K-means-specific names can stay and where generic clustering names would help.

Acceptance criteria:

- The current K-means flow is mapped.
- No runtime behavior changes.
- No files are edited unless a short audit note is explicitly created.

```text
Codex prompt:
Audit the current Cluster Analysis architecture for adding Agglomerative Clustering.

Inspect before editing:
- backend/services/teamClusteringService.js
- backend/lib/pythonKMeansClient.js
- backend/python/kmeans_runner.py
- backend/controllers/teamController.js
- backend/api/routes.js
- frontend/src/api/api.ts
- frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx
- frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts
- frontend/src/components/cluster-analysis/components/ElbowMethodPanel.tsx
- frontend/src/components/cluster-analysis/components/ClusterMembershipSummary.tsx

Do not change runtime behavior.
Do not change K-means behavior, request payloads, response payloads, UI copy, normalization, or selected entry/stat behavior.

Produce a concise architecture map covering:
- current frontend request lifecycle
- current backend route -> controller -> service flow
- current normalized matrix preparation
- current Python K-means runner interface
- current result rendering points
- safest places to add Agglomerative as an additional algorithm

If you create an audit file, place it under docs/ and keep it temporary/reviewable.
Run git diff after the audit and show the diff.
Avoid unrelated refactors.
```

### Step 2: Extract or confirm shared normalized matrix preparation

Goal:

Make sure both K-means and Agglomerative use the same normalized matrix and do not duplicate matrix-building logic.

Files likely affected:

- `backend/services/teamClusteringService.js`
- Possibly a new backend helper file such as `backend/services/teamClusterDataset.js` only if extraction is clearly safer

What to change:

- Prefer confirming that `buildClusterDataset` and `buildNormalizedMatrix` can be reused.
- If needed, export or move a shared dataset builder.
- Do not alter normalization math.
- Keep warnings, stat metadata, raw stats, normalized stats, and row ordering unchanged.

Acceptance criteria:

- K-means still receives the same `points = dataset.rows.map((row) => row.vector)`.
- Agglomerative will be able to call the same dataset builder.
- Existing K-means endpoint responses are unchanged.

```text
Codex prompt:
Prepare the backend clustering service so K-means and future Agglomerative Clustering share exactly the same normalized matrix preparation.

Inspect before editing:
- backend/services/teamClusteringService.js
- backend/lib/teamStatsMetadata.js
- backend/repositories/teamRepository.js

Make minimal changes only if needed.
Keep the existing K-means output and normalization behavior unchanged:
- missing/invalid values become 0
- min-max normalization stays 0 to 1
- negative-direction stats are inverted after normalization
- row order follows the selected team-season entries
- rawStats and normalizedStats remain available

Do not duplicate matrix-building logic.
Do not change database schema.
Do not expose external api_id values.
Do not refactor unrelated service code.

After changes, run a syntax check or the closest backend check available.
Run git diff and show the diff.
```

### Step 3: Define shared algorithm request/response contracts

Goal:

Add clear TypeScript/backend contract names for `kmeans` and `agglomerative` while preserving existing K-means calls.

Files likely affected:

- `frontend/src/api/api.ts`
- `frontend/src/components/cluster-analysis/types.ts`
- `backend/services/teamClusteringService.js`
- Optional: backend JSDoc or constants near clustering service

What to change:

- Add an algorithm type such as `"kmeans" | "agglomerative"`.
- Keep the existing `calculateTeamClusterElbow` request K-means-only.
- Add a new Agglomerative request type instead of forcing elbow into Agglomerative.
- Suggested request:

```ts
type TeamAgglomerativeClusterRunRequest = TeamClusterRequest & {
  algorithm: "agglomerative";
  k: number;
  linkage?: "ward" | "complete" | "average" | "single";
};
```

- Suggested response:

```ts
type TeamAgglomerativeClusterRunPayload = {
  context: { selectedEntryCount: number };
  algorithm: "agglomerative";
  k: number;
  linkage: string;
  stats: TeamClusterStat[];
  assignments: TeamClusterAssignment[];
  dendrogramSvg?: string;
  dendrogramImage?: string;
  linkageMatrix?: number[][];
  warnings: string[];
};
```

Acceptance criteria:

- Existing K-means TypeScript types still compile.
- New Agglomerative types are explicit and do not use broad `any`.
- Contracts use internal `teamId`, `tournamentId`, and `seasonId`.

```text
Codex prompt:
Add explicit frontend/backend contract definitions for Agglomerative Clustering without changing existing K-means contracts.

Inspect before editing:
- frontend/src/api/api.ts
- frontend/src/components/cluster-analysis/types.ts
- backend/services/teamClusteringService.js

Add typed support for:
- algorithm values: "kmeans" and "agglomerative"
- Agglomerative run request with teamSeasonEntries, statKeys, k, and optional linkage
- Agglomerative run response with algorithm, k, linkage, stats, assignments, optional dendrogramSvg or dendrogramImage, optional linkageMatrix, and warnings

Keep current calculateTeamClusterElbow and runTeamClusters behavior unchanged.
Avoid broad any usage.
Use internal database ids only.
Do not implement DBSCAN or Apriori.
Run npm run build from frontend if TypeScript types changed, or the closest available check.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 4: Add backend API support for algorithm selection

Goal:

Expose Agglomerative as an additional backend path without breaking the current K-means endpoints.

Files likely affected:

- `backend/api/routes.js`
- `backend/controllers/teamController.js`
- `backend/services/teamClusteringService.js`
- Optional: `backend/postman/README.md`

What to change:

- Prefer a new endpoint:

```text
POST /api/teams/clustering/agglomerative/run
```

- Keep existing endpoints:

```text
POST /api/teams/clustering/elbow
POST /api/teams/clustering/run
```

- Add a controller like `runTeamAgglomerativeClustersController`.
- Add a service function like `runTeamAgglomerativeClusters`.
- Initially the service may return a clear `501` placeholder only if Step 5 is not done in the same pass. If implementing end to end, wire it to the Python client later.

Acceptance criteria:

- Existing K-means routes still work.
- Agglomerative has a separate route/controller/service entry point.
- API responses still use `{ data: ... }` for success.
- Errors use existing HTTP helper conventions.

```text
Codex prompt:
Add backend API support for Agglomerative Clustering as an additional clustering route.

Inspect before editing:
- backend/api/routes.js
- backend/controllers/teamController.js
- backend/services/teamClusteringService.js
- backend/lib/http.js

Add a new endpoint:
POST /api/teams/clustering/agglomerative/run

Add a thin controller and service entry point for Agglomerative.
Keep existing K-means routes and behavior unchanged:
- POST /api/teams/clustering/elbow
- POST /api/teams/clustering/run

Use the existing route -> controller -> service pattern.
Use { data: ... } for successful responses.
Do not change the database schema.
Do not expose external api_id values.
Do not implement DBSCAN or Apriori.

If the Python implementation is not added in this step, return a clear temporary HttpError and document that it is temporary.
Run a backend syntax check or npm run test:api if appropriate and available.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 5: Add Python Agglomerative script

Goal:

Implement Agglomerative Clustering in Python using the normalized matrix provided by Node.

Files likely affected:

- New `backend/python/agglomerative_runner.py`
- `backend/requirements.txt`
- Possibly `backend/python/requirements.txt`

What to change:

- Read JSON from stdin and write JSON to stdout, matching the K-means runner style.
- Validate `points`, `k`, and `linkage`.
- Use Python libraries already available if possible.
- Recommended libraries:
  - `scikit-learn` for `AgglomerativeClustering`
  - `scipy.cluster.hierarchy` for linkage/dendrogram data or image generation
  - `matplotlib` only if generating static images
- Return cluster labels as zero-based integers from Python; convert to one-based `clusterId` in the backend for UI consistency.

Acceptance criteria:

- The script can run from stdin with a small sample matrix.
- It returns valid JSON.
- Invalid inputs exit non-zero with stderr.
- No K-means script behavior changes.

```text
Codex prompt:
Add a Python Agglomerative Clustering runner modeled after backend/python/kmeans_runner.py.

Inspect before editing:
- backend/python/kmeans_runner.py
- backend/requirements.txt
- backend/python/requirements.txt
- backend/how-to-run.md

Create backend/python/agglomerative_runner.py.
The runner must:
- read JSON from stdin
- validate points as a non-empty numeric matrix
- validate k as an integer from 2 to number of rows
- validate linkage, defaulting to "ward"
- run Agglomerative Clustering using Python
- write compact JSON to stdout
- write useful errors to stderr and exit non-zero on failure

Keep K-means behavior unchanged.
Do not change database schema.
Do not implement DBSCAN or Apriori.
Do not duplicate unnecessary code unless sharing Python helpers would cause a larger refactor.

Run a direct stdin smoke test for the new script with a small matrix.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 6: Add dendrogram output support

Goal:

Return a dendrogram representation that the frontend can render in the first version.

Files likely affected:

- `backend/python/agglomerative_runner.py`
- `backend/requirements.txt`
- Possibly `backend/python/requirements.txt`

What to change:

- Preferred first version: generate a static dendrogram image in Python.
- Prefer SVG if it is straightforward:
  - use Matplotlib with SVG output to an in-memory string
  - return `dendrogramSvg`
- Fallback: PNG base64 data URL:
  - use Matplotlib with `BytesIO`
  - return `dendrogramImage`
- Include labels if Node passes labels, or use row numbers if not.
- Keep image size reasonable.

Acceptance criteria:

- Python returns either `dendrogramSvg` or `dendrogramImage`.
- The output is valid JSON and small enough for selected team-season datasets.
- Cluster assignments still return correctly.

```text
Codex prompt:
Add dendrogram output to backend/python/agglomerative_runner.py.

Inspect before editing:
- backend/python/agglomerative_runner.py
- backend/requirements.txt
- backend/python/requirements.txt

Prefer the fastest safe thesis version:
- return a static SVG dendrogram as dendrogramSvg if practical
- otherwise return a PNG data URL as dendrogramImage

Use scipy.cluster.hierarchy linkage/dendrogram and matplotlib only as needed.
Accept optional labels from the JSON payload.
Keep the core cluster labels as JSON.
Do not build a custom React dendrogram renderer in this step.
Do not change K-means behavior.
Do not implement DBSCAN or Apriori.

Run a direct stdin smoke test and confirm the JSON contains assignments plus dendrogramSvg or dendrogramImage.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 7: Add backend Python client wrapper

Goal:

Let Node call the Agglomerative Python runner safely, with timeout and JSON parsing behavior similar to K-means.

Files likely affected:

- New `backend/lib/pythonAgglomerativeClient.js`
- `backend/services/teamClusteringService.js`

What to change:

- Create a wrapper similar to `pythonKMeansClient.js`.
- Use `TRANSFERMIND_PYTHON_BIN` and a timeout.
- Pass normalized points and display labels to Python.
- Parse JSON and convert runner failures into `HttpError`.
- In the service, map Python labels back onto `dataset.rows`.
- Preserve raw stats and normalized stats in assignments.

Acceptance criteria:

- Backend service can call Python and return assignments.
- Assignment row order matches selected team-season entry order.
- Cluster IDs are one-based in public API responses.
- K-means wrapper remains unchanged unless a tiny shared process helper is clearly worth it.

```text
Codex prompt:
Add a backend Python client wrapper for Agglomerative Clustering and wire it into the Agglomerative service function.

Inspect before editing:
- backend/lib/pythonKMeansClient.js
- backend/services/teamClusteringService.js
- backend/python/agglomerative_runner.py

Create backend/lib/pythonAgglomerativeClient.js or the smallest equivalent wrapper.
The wrapper must:
- use TRANSFERMIND_PYTHON_BIN with python3 fallback
- spawn backend/python/agglomerative_runner.py
- send JSON through stdin
- collect stdout/stderr
- enforce a timeout
- parse JSON
- return HttpError on failure using the project's existing style

Wire the Agglomerative service to:
- reuse the shared normalized matrix dataset
- send points and readable row labels to Python
- return algorithm, k, linkage, stats, assignments, dendrogramSvg or dendrogramImage, optional linkageMatrix, and warnings
- keep clusterId one-based in the API response

Keep K-means behavior unchanged.
Do not expose api_id values.
Do not change database schema.
Run a backend smoke check or syntax check.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 8: Add frontend algorithm selector

Goal:

Let the user choose between K-means and Agglomerative without changing the current default behavior.

Files likely affected:

- `frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx`
- `frontend/src/components/cluster-analysis/hooks/useClusterSelectionState.ts`
- `frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts`
- `frontend/src/components/cluster-analysis/components/ClusterSetupPanel.tsx`
- `frontend/src/components/cluster-analysis/types.ts`

What to change:

- Add `selectedAlgorithm` state with default `"kmeans"`.
- Add selector UI in the setup area.
- When the algorithm changes, clear stale elbow/cluster/agglomerative results.
- Keep existing K-means elbow and run controls visible only for K-means.
- Show Agglomerative cluster count controls separately, or reuse the existing K selector only if the UI remains clear.

Acceptance criteria:

- Default page behavior still starts on K-means.
- Existing K-means flow still works.
- Agglomerative selection does not show the elbow method as if it applied.
- Changing algorithms clears stale result panels.

```text
Codex prompt:
Add a frontend algorithm selector to Cluster Analysis with K-means as the default and Agglomerative as an additional option.

Inspect before editing:
- frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx
- frontend/src/components/cluster-analysis/hooks/useClusterSelectionState.ts
- frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts
- frontend/src/components/cluster-analysis/components/ClusterSetupPanel.tsx
- frontend/src/components/cluster-analysis/types.ts

Make minimal changes.
Add selectedAlgorithm state typed as "kmeans" | "agglomerative".
Default to "kmeans".
Add selector UI near the existing clustering setup controls.
Keep current K-means behavior unchanged.
Only show the elbow method for K-means.
Clear stale results when the algorithm changes.

Do not implement custom dendrogram rendering in this step.
Do not implement DBSCAN or Apriori.
Avoid broad any usage.
Run npm run build and npm run lint from frontend if available.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 9: Render Agglomerative results in the UI

Goal:

Display dendrogram output and cluster assignments for Agglomerative results.

Files likely affected:

- New `frontend/src/components/cluster-analysis/components/AgglomerativeResultsPanel.tsx`
- `frontend/src/components/cluster-analysis/components/index.ts`
- `frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx`
- `frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts`
- `frontend/src/api/api.ts`
- `frontend/src/components/cluster-analysis/types.ts`

What to change:

- Add frontend API function for `POST /api/teams/clustering/agglomerative/run`.
- Store `agglomerativeResult` separately from `clusterResult`, or use a discriminated union if that stays readable.
- Render:
  - result header
  - short explanation text
  - dendrogram image or SVG
  - warnings
  - cluster assignment list/table
- Reuse existing assignment display helpers where safe.

Acceptance criteria:

- Agglomerative result renders without affecting K-means result panels.
- Static dendrogram displays responsively.
- Assignment rows include team name, tournament/season, cluster id, raw stats, and normalized stats where relevant.
- No direct Supabase access in frontend.

```text
Codex prompt:
Render Agglomerative Clustering results in the Cluster Analysis UI.

Inspect before editing:
- frontend/src/api/api.ts
- frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx
- frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts
- frontend/src/components/cluster-analysis/components/index.ts
- frontend/src/components/cluster-analysis/components/ClusterMembershipSummary.tsx
- frontend/src/components/cluster-analysis/types.ts

Add a frontend API function for POST /api/teams/clustering/agglomerative/run.
Add result state and request handling for Agglomerative without changing K-means.
Create an AgglomerativeResultsPanel if that is the cleanest minimal component.
Render:
- short explanation text
- warnings
- dendrogramSvg or dendrogramImage
- cluster assignment list/table

Keep K-means average profiles, parallel coordinates, elbow method, and membership summary unchanged.
Do not build a custom dendrogram renderer unless the backend already returns graph-ready JSON and the code stays small.
Do not implement DBSCAN or Apriori.
Avoid broad any usage.
Run npm run build and npm run lint from frontend if available.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 10: Add loading/error/empty states

Goal:

Make the Agglomerative request lifecycle feel as complete as the K-means flow.

Files likely affected:

- `frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts`
- `frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx`
- `frontend/src/components/cluster-analysis/components/ClusterSetupPanel.tsx`
- `frontend/src/components/cluster-analysis/components/AgglomerativeResultsPanel.tsx`

What to change:

- Add loading state for Agglomerative run.
- Disable duplicate requests while loading.
- Reuse `requestError` or add an algorithm-specific error if clearer.
- Show validation messages before making the request.
- Clear stale Agglomerative output when selected entries/stats/k/linkage change.

Acceptance criteria:

- User cannot submit duplicate Agglomerative requests.
- Clear error messages show for invalid input and backend failures.
- Result panel disappears when inputs change.
- K-means loading/error states still behave as before.

```text
Codex prompt:
Add loading, error, and empty-state handling for the Agglomerative Cluster Analysis flow.

Inspect before editing:
- frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts
- frontend/src/components/teams-comparison/ClusterAnalysisTab.tsx
- frontend/src/components/cluster-analysis/components/ClusterSetupPanel.tsx
- frontend/src/components/cluster-analysis/components/AgglomerativeResultsPanel.tsx

Make minimal changes.
Add or confirm:
- Agglomerative loading state
- disabled run button while loading
- validation before API calls
- stale result clearing when selected entries, selected stats, k, linkage, or algorithm changes
- useful empty state if no dendrogram is returned

Keep K-means request lifecycle unchanged.
Avoid unrelated refactors.
Avoid broad any usage.
Run npm run build and npm run lint from frontend if available.
Run git diff and show the diff.
```

### Step 11: Add validation rules

Goal:

Prevent invalid Agglomerative requests and keep backend error messages thesis-friendly.

Files likely affected:

- `backend/services/teamClusteringService.js`
- `backend/python/agglomerative_runner.py`
- `frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts`
- `frontend/src/components/cluster-analysis/components/ClusterSetupPanel.tsx`

What to change:

- Require at least three team-season entries, matching current cluster analysis.
- Require at least two selected stats.
- Require `k >= 2`.
- Require `k <= selectedEntryCount`.
- Validate linkage values.
- For `ward`, keep Euclidean assumptions and numeric matrix input.

Acceptance criteria:

- Frontend blocks obvious invalid requests.
- Backend rejects invalid requests with 400-level errors where appropriate.
- Python validates again and fails safely.
- K-means validation stays unchanged.

```text
Codex prompt:
Add validation rules for Agglomerative Clustering across frontend, backend, and Python.

Inspect before editing:
- backend/services/teamClusteringService.js
- backend/python/agglomerative_runner.py
- frontend/src/components/cluster-analysis/hooks/useClusterRequests.ts
- frontend/src/components/cluster-analysis/components/ClusterSetupPanel.tsx

Validation must enforce:
- at least three selected team-season entries
- at least two selected statistics
- k is an integer at least 2
- k is at most the selected entry count
- linkage is one of the supported values

Use frontend validation for user guidance and backend/Python validation for safety.
Keep K-means validation unchanged.
Do not change database schema.
Do not expose api_id values.
Run backend and frontend checks appropriate to the files changed.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 12: Add tests/manual verification

Goal:

Verify the new algorithm without broad test rewrites.

Files likely affected:

- Existing test files if present
- Optional new backend runner smoke test
- Optional docs update in `backend/postman/README.md`

What to change:

- Add minimal tests where the repo already has a test pattern.
- If formal tests are not available, add documented manual verification commands.
- Add a Postman note for the new endpoint if API docs are maintained there.

Acceptance criteria:

- Python runner smoke test passes.
- Backend route can be exercised with a sample payload.
- Frontend build/lint passes.
- Manual checklist is documented.

```text
Codex prompt:
Add focused verification for Agglomerative Clustering.

Inspect before editing:
- backend/package.json
- frontend/package.json
- backend/postman/README.md
- any existing backend or frontend test files

Prefer existing test patterns.
If there is no suitable automated test setup, add concise manual verification documentation instead of inventing a large framework.

Verify:
- Python agglomerative runner accepts a sample matrix and returns assignments plus dendrogram output
- backend endpoint responds through { data: ... }
- frontend types/build pass
- K-means endpoints and UI remain unchanged

Do not add broad new test infrastructure.
Do not implement DBSCAN or Apriori.
Run the relevant checks.
Run git diff and show the diff.
Avoid unrelated refactors.
```

### Step 13: Final cleanup and thesis explanation text

Goal:

Make the feature understandable in code, UI, and thesis notes without adding extra scope.

Files likely affected:

- `frontend/src/components/cluster-analysis/components/AgglomerativeResultsPanel.tsx`
- `frontend/src/components/cluster-analysis/README.md`
- `backend/postman/README.md`
- Optional thesis-facing docs under `docs/`

What to change:

- Add concise UI explanation text.
- Update Cluster Analysis README to mention both algorithms.
- Update API docs if a new endpoint was added.
- Remove temporary placeholders and dead code.
- Ensure K-means and Agglomerative names are consistent.

Acceptance criteria:

- The UI clearly explains dendrogram interpretation.
- Docs mention Agglomerative as an additional option.
- No stale temporary 501 code remains if the feature is implemented.
- No unrelated formatting churn.

```text
Codex prompt:
Do final cleanup for the Agglomerative Clustering implementation and add concise thesis-friendly explanation text.

Inspect before editing:
- frontend/src/components/cluster-analysis/components/AgglomerativeResultsPanel.tsx
- frontend/src/components/cluster-analysis/README.md
- backend/postman/README.md
- docs/

Make minimal documentation and copy updates:
- explain that Agglomerative uses the same normalized 0-1 matrix as K-means
- explain that the dendrogram shows hierarchical merge distance
- explain that cluster assignments come from cutting the hierarchy at the chosen cluster count

Remove temporary placeholders if the feature is complete.
Keep K-means behavior unchanged.
Do not implement DBSCAN or Apriori.
Do not change database schema.
Run frontend/backend checks relevant to changed files.
Run git diff and show the diff.
Avoid unrelated refactors.
```

## 6. Testing Instructions After Each Major Phase

### Phase A: Backend contract and route wiring, Steps 1-4

Run from repository root or `backend/` as appropriate:

```bash
git status --short
npm run test:api
```

If `npm run test:api` is not reliable for the changed files, at least start the backend and smoke-check `/health`.

Expected result:

- Existing K-means endpoints still respond.
- New Agglomerative route exists.
- No database migration is required.

### Phase B: Python runner and backend wrapper, Steps 5-7

Run from `backend/`:

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
python python/agglomerative_runner.py
```

For the direct runner test, pass sample JSON through stdin, for example:

```bash
printf '%s' '{"points":[[0,0],[0.1,0.2],[0.9,0.8],[1,1]],"k":2,"linkage":"ward","labels":["A","B","C","D"]}' | python python/agglomerative_runner.py
```

Expected result:

- JSON includes assignments.
- JSON includes `dendrogramSvg` or `dendrogramImage`.
- Invalid input exits non-zero and prints an error to stderr.

### Phase C: Frontend UI integration, Steps 8-11

Run from `frontend/`:

```bash
npm run lint
npm run build
```

Expected result:

- TypeScript compiles.
- Existing K-means flow still renders.
- Agglomerative selector and result panel render.
- No direct Supabase access is introduced in frontend code.

### Phase D: Final verification, Steps 12-13

Run:

```bash
git status --short
git diff
```

Then run the most relevant checks:

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd backend
npm run test:api
```

Expected result:

- Diff is focused on clustering implementation and docs.
- No old migrations were edited.
- No `.env` or secrets were touched.
- K-means and Agglomerative both work from the UI.

## 7. Final Manual Test Checklist

Use the Teams Comparison page and Cluster Analysis tab.

- K-means is selected by default.
- Existing K-means elbow method still works.
- Existing K-means final clustering still works.
- Existing K-means result charts still render.
- Select Agglomerative.
- The elbow method is hidden or clearly marked as K-means-only.
- Agglomerative run button is disabled until valid inputs exist.
- Agglomerative validates at least three team-season entries.
- Agglomerative validates at least two selected stats.
- Agglomerative validates a cluster count between 2 and selected entry count.
- Agglomerative request sends internal `teamId`, `tournamentId`, and `seasonId`.
- Backend uses the same normalized matrix builder as K-means.
- Missing/invalid stat values are treated as `0`.
- Negative-direction stats are inverted after normalization.
- Dendrogram renders in the result area.
- Cluster assignment list/table renders team name, season/tournament context, and cluster id.
- Raw stat values remain visible or available where the existing UI expects them.
- Backend warnings are displayed.
- Changing selected teams clears stale Agglomerative results.
- Changing selected stats clears stale Agglomerative results.
- Switching between algorithms clears stale algorithm-specific results.
- No `api_id` values appear in frontend routes, request args, or public responses.
- No schema migration was added unless there was a separately justified need.

## 8. Do Not Do

- Do not replace K-means with Agglomerative.
- Do not remove the existing Cluster Analysis feature.
- Do not remove Custom Comparison or Cluster Analysis from Teams Comparison.
- Do not rewrite the entire Cluster Analysis UI.
- Do not duplicate K-means matrix-building logic.
- Do not let Agglomerative build a different normalized matrix than K-means.
- Do not change existing K-means endpoint behavior.
- Do not add DBSCAN or Apriori in this implementation.
- Mention DBSCAN and Apriori only as future work or out of scope.
- Do not add a database migration unless a real schema need appears.
- Do not expose external football API ids in frontend contracts.
- Do not create Supabase clients in frontend code.
- Do not add broad `any` usage.
- Do not reintroduce `key_passes`.
- Do not perform broad formatting, linting, or unrelated refactors.

## 9. Future Work

After the first thesis-safe version is complete, possible improvements include:

- replacing static dendrogram images with graph-ready dendrogram JSON and a custom React SVG renderer
- adding hover tooltips on dendrogram branches
- adding distance threshold controls
- comparing K-means clusters and Agglomerative clusters side by side
- documenting DBSCAN or Apriori as future methods outside the current implementation scope
