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
5. `POST /api/teams/clustering/elbow` with `tournamentId`, `seasonId`, `teamIds`, `statKeys`, and optional `maxK` returns Min-Max normalized matrix rows plus global Elbow Method inertia values.
6. `POST /api/teams/clustering/run` with `tournamentId`, `seasonId`, `teamIds`, `statKeys`, and `k` returns final K-Means cluster assignments, centroids, distances, and warnings.
7. `GET /api/players`
8. `GET /api/tournaments/current-seasons`
9. `GET /api/teams/:id`
10. `GET /api/teams/:id/stats`
11. `GET /api/players?teamId=:teamId`
12. `GET /api/players/:id`
13. `GET /api/standings?tournamentId=:tournamentId&seasonId=:seasonId` returns grouped standings with `selectedGroupKey`.
14. Error-case requests

The seed requests save these environment variables automatically when data exists:

- `teamId`
- `playerId`
- `tournamentId`
- `seasonId`

If a downstream request is run before its prerequisite seed request, the Postman test will fail with a clear message explaining which earlier request to run first.
