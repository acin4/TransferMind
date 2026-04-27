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
5. `GET /api/players`
6. `GET /api/tournaments/current-seasons`
7. `GET /api/teams/:id`
8. `GET /api/teams/:id/stats`
9. `GET /api/players?teamId=:teamId`
10. `GET /api/players/:id`
11. `GET /api/standings?tournamentId=:tournamentId&seasonId=:seasonId` returns grouped standings with `selectedGroupKey`.
12. Error-case requests

The seed requests save these environment variables automatically when data exists:

- `teamId`
- `playerId`
- `tournamentId`
- `seasonId`

If a downstream request is run before its prerequisite seed request, the Postman test will fail with a clear message explaining which earlier request to run first.
