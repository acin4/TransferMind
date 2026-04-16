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
3. `GET /api/players`
4. `GET /api/tournaments/current-seasons`
5. `GET /api/teams/:id`
6. `GET /api/teams/:id/stats`
7. `GET /api/players?teamId=:teamId`
8. `GET /api/players/:id`
9. `GET /api/standings?tournamentId=:tournamentId&seasonId=:seasonId`
10. Error-case requests

The seed requests save these environment variables automatically when data exists:

- `teamId`
- `playerId`
- `tournamentId`
- `seasonId`

If a downstream request is run before its prerequisite seed request, the Postman test will fail with a clear message explaining which earlier request to run first.
