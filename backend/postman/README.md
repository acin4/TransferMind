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
7. `POST /api/team-season-stats/association-rules` with `teamSeasonEntries`, `statKeys`, `minSupport`, `minConfidence`, and optional `minLift` returns Apriori association rules. Each team-season entry is identified by internal `teamId`, `tournamentId`, and `seasonId`.
8. `GET /api/players`
9. `GET /api/players/team-squads`
10. `GET /api/tournaments/current-seasons`
11. `GET /api/teams/:id`
12. `GET /api/teams/:id/stats`
13. `GET /api/players?teamId=:teamId`
14. `GET /api/players/:id`
15. `GET /api/standings?tournamentId=:tournamentId&seasonId=:seasonId` returns grouped standings with `selectedGroupKey`; each row includes `team_logo` when available.
16. Error-case requests

The seed requests save these environment variables automatically when data exists:

- `teamId`
- `playerId`
- `tournamentId`
- `seasonId`

If a downstream request is run before its prerequisite seed request, the Postman test will fail with a clear message explaining which earlier request to run first.
