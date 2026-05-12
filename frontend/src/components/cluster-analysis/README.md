# Cluster Analysis

This folder contains the extracted Cluster Analysis feature used by the Teams Comparison page. It keeps clustering setup, request state, chart preparation, and presentational panels close together while `../teams-comparison/ClusterAnalysisTab.tsx` remains the feature orchestrator.

Cluster Analysis currently supports two algorithms:

- K-means is the default flow. It uses the selected team-season entries and selected statistics to calculate an elbow curve, run a final K-means clustering request, and render average profiles, parallel coordinates, and membership summaries.
- Agglomerative Clustering is the hierarchical flow. It uses the same normalized 0-1 matrix as K-means, renders a dendrogram showing hierarchical merge distance, and assigns clusters by cutting the hierarchy at the selected cluster count.

State lives in hooks under `hooks/`. `useClusterSelectionState` owns the selected team-season entries, selected stats, filters, algorithm choice, K-means max K, and Agglomerative cluster/linkage controls. `useClusterSetupData` derives option lists and request-ready entries. `useClusterSetupMaintenanceEffects` keeps selected ids, stats, and cluster counts aligned with available inputs. `useClusterRequests` owns elbow, K-means run, and Agglomerative run API request state. `useClusterProfiles` derives cluster groups and average profiles from the K-means run result.

API calls happen only in `hooks/useClusterRequests.ts`, through the frontend API gateway functions from `frontend/src/api/api.ts`.

Chart helpers live in `utils/clusterChartUtils.ts`, with clustering data helpers in `utils/clusterAnalysisUtils.ts` and display formatting in `utils/clusterFormatters.ts`.

Presentational components live in `components/`. They should receive prepared data and callbacks through typed props from `types.ts`; they should not fetch data or reimplement clustering rules. Keep K-means result panels separate from `AgglomerativeResultsPanel` so centroid-specific K-means concepts do not leak into the hierarchical result UI.

For future changes, keep new stateful behavior in hooks, shared calculations in `utils/`, and UI-only rendering in `components/`. Preserve internal database id usage, raw-vs-normalized value display, selected team/stat behavior, and backend API access through `frontend/src/api/api.ts`.
