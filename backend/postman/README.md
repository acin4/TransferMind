# Postman Setup

Files:

- `backend/postman/TransferMind API.postman_collection.json`
- `backend/postman/TransferMind Local.postman_environment.json`

## Import

1. Open Postman.
2. Import the collection JSON file.
3. Import the environment JSON file.
4. Select the `TransferMind Local` environment.

## Local Requirements

- The backend must be running on `http://localhost:3001`
- The collection uses `{{baseUrl}}` from the environment for every request

## Recommended Request Order

1. `GET /health`
2. `GET /api/teams`
3. `GET /api/teams/comparison-dataset`
4. `POST /api/teams/comparison-dataset` with `tournamentId`, `seasonId`, `teamIds`, and `statKeys` returns the backend-normalized Teams Comparison matrix.
5. `POST /api/teams/clustering/elbow` with `teamSeasonEntries`, `statKeys`, and optional `maxK` returns Min-Max normalized matrix rows plus global Elbow Method inertia values.
6. `POST /api/teams/clustering/run` with `teamSeasonEntries`, `statKeys`, and `k` returns final K-Means cluster assignments, centroids, distances, and warnings. Each team-season entry is identified by internal `teamId`, `tournamentId`, and `seasonId`.
7. `POST /api/teams/clustering/agglomerative/run` with `teamSeasonEntries`, `statKeys`, `k`, and `linkage` returns Agglomerative cluster assignments, a dendrogram SVG string, and warnings. Each team-season entry is identified by internal `teamId`, `tournamentId`, and `seasonId`.
8. `POST /api/team-season-stats/association-rules` with `teamSeasonEntries`, `statKeys`, `minSupport`, `minConfidence`, and optional `minLift` returns Apriori association rules. Each team-season entry is identified by internal `teamId`, `tournamentId`, and `seasonId`.
9. `GET /api/players`
10. `GET /api/players/team-squads`
11. `GET /api/tournaments/current-seasons`
12. `GET /api/teams/:id`
13. `GET /api/teams/:id/stats`
14. `GET /api/players?teamId=:teamId`
15. `GET /api/players/:id`
16. `GET /api/standings?tournamentId=:tournamentId&seasonId=:seasonId` returns grouped standings with `selectedGroupKey`; each row includes `team_logo` when available.
17. Error-case requests

The seed requests save these environment variables automatically when data exists:

- `teamId`
- `playerId`
- `tournamentId`
- `seasonId`

If a downstream request is run before its prerequisite seed request, the Postman test will fail with a clear message explaining which earlier request to run first.

## Agglomerative Clustering Verification

Use these checks after changing Agglomerative Clustering. They are intentionally manual because this repo does not currently include a runnable automated API test harness; `backend/package.json` defines `test:api`, but the referenced `backend/api/fetchTest.js` file is not present.

1. Smoke test the Python runner from the repo root:

```powershell
'{"points":[[0,0],[0.1,0.2],[0.9,0.8],[1,1]],"k":2,"linkage":"ward","labels":["A","B","C","D"]}' | python backend/python/agglomerative_runner.py
```

Expected result: compact JSON containing `assignments`, `dendrogramSvg`, and `warnings`.

2. Start the backend from `backend/`:

```powershell
npm start
```

3. Run `GET /health` in Postman and confirm the backend is reachable.

4. Seed valid internal ids through `GET /api/teams/comparison-dataset` or the Teams Comparison dataset request, then run `POST /api/teams/clustering/agglomerative/run` with at least three entries and two stat keys:

```json
{
  "teamSeasonEntries": [
    { "teamId": 1, "tournamentId": 1, "seasonId": 1 },
    { "teamId": 2, "tournamentId": 1, "seasonId": 1 },
    { "teamId": 3, "tournamentId": 1, "seasonId": 1 }
  ],
  "statKeys": ["goals_for", "goals_against"],
  "k": 2,
  "linkage": "ward"
}
```

Replace the sample ids and stat keys with values returned by the dataset endpoint. Expected result: the response is wrapped as `{ "data": ... }`, `data.algorithm` is `"agglomerative"`, `data.assignments` has one row per selected entry, and `data.dendrogramSvg` is a non-empty SVG string.

5. Negative API checks:

- `linkage: "bad"` should return a 400-level validation error.
- `k: 1` should return a 400-level validation error.
- `k` greater than the selected entry count should return a 400-level validation error.
- Fewer than three `teamSeasonEntries` or fewer than two `statKeys` should return a 400-level validation error.

6. Regression checks:

- `POST /api/teams/clustering/elbow` still returns K-means elbow data.
- `POST /api/teams/clustering/run` still returns K-means assignments, centroids, distances, and warnings.
- In the frontend Cluster Analysis tab, K-means is still the default algorithm, the elbow panel only appears for K-means, and Agglomerative renders the dendrogram plus assignment details after `Run Agglomerative`.

7. Frontend checks from `frontend/`:

```powershell
npm run build
npm run lint
```
