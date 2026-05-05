# Cluster Analysis

This folder contains the extracted Cluster Analysis feature used by the Teams Comparison page. It keeps clustering setup, request state, chart preparation, and presentational panels close together while `../teams-comparison/ClusterAnalysisTab.tsx` remains the feature orchestrator.

State lives in hooks under `hooks/`. `useClusterSelectionState` owns the selected team-season entries, selected stats, filters, and max K. `useClusterSetupData` derives option lists and request-ready entries. `useClusterSetupMaintenanceEffects` keeps selected ids, stats, and max K aligned with available inputs. `useClusterRequests` owns elbow and cluster API request state. `useClusterProfiles` derives cluster groups and average profiles from the run result.

API calls happen only in `hooks/useClusterRequests.ts`, through the frontend API gateway functions from `frontend/src/api/api.ts`.

Chart helpers live in `utils/clusterChartUtils.ts`, with clustering data helpers in `utils/clusterAnalysisUtils.ts` and display formatting in `utils/clusterFormatters.ts`.

Presentational components live in `components/`. They should receive prepared data and callbacks through typed props from `types.ts`; they should not fetch data or reimplement clustering rules.

For future changes, keep new stateful behavior in hooks, shared calculations in `utils/`, and UI-only rendering in `components/`. Preserve internal database id usage, raw-vs-normalized value display, selected team/stat behavior, and backend API access through `frontend/src/api/api.ts`.
