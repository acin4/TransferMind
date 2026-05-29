# TransferMind

TransferMind is a football analytics and scouting web application for exploring team and player data, league standings, team-season comparisons, clustering results, association rules, and statistical visualizations.

The production app uses a React/Vite frontend, a Node.js/Express API backend, PostgreSQL through Supabase, and Python analysis runners for machine learning and data mining features.

## Main Features

- Standings views by tournament, season, stage, and group.
- Team directory, team profile pages, squad views, standings previews, and season-specific team statistics.
- Player directory and player profile pages.
- Team-season comparison with selectable statistics, raw values, normalized values, and adjusted scores.
- K-Means clustering with elbow analysis.
- Agglomerative clustering with dendrogram output.
- Apriori association rule mining for team-season stat patterns.
- Backend ingestion jobs for tournaments, seasons, standings, teams, team logos, players, team stats, and player stats.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, React Router, Recharts, lucide-react, Tailwind CSS tooling.
- Backend: Node.js, Express 5, ES modules, Axios, Supabase JavaScript client.
- Database: PostgreSQL/Supabase with migrations in `supabase/migrations/`.
- Analysis modules: Python runners for K-Means, Agglomerative clustering, and Apriori association rules.
- Deployment: Vercel for the frontend, Render for the backend.
- Automation: GitHub Actions for scheduled and manual ingestion jobs.

## Project Structure

```text
frontend/                 React + TypeScript + Vite application
frontend/src/api/         Frontend API gateway for backend calls
frontend/src/pages/       Main application pages
frontend/src/components/  UI components for standings, profiles, comparison, and analysis
frontend/vercel.json      Vercel SPA rewrite configuration

backend/                  Express API, ingestion jobs, services, repositories, Python runners
backend/api/              API route registration
backend/controllers/      Request parsing and HTTP response controllers
backend/services/         Business logic, response shaping, clustering, and association rules
backend/repositories/     Supabase query layer
backend/ingestion/        Data ingestion scripts
backend/jobs/             Refresh job entrypoints
backend/python/           Python analysis runner scripts

supabase/migrations/      Database schema and view migrations
.github/workflows/        Scheduled/manual ingestion workflows
```

## Prerequisites

- Node.js 20 is recommended. The GitHub Actions workflows run on Node 20.
- npm.
- Python 3 with the analysis dependencies installed for clustering and association rules.
- A Supabase project with the required schema/migrations applied.
- RapidAPI/Sofascore credentials for ingestion jobs.

## Environment Variables

Example files are provided at `frontend/.env.example` and `backend/.env.example`.

Frontend:

```env
VITE_API_BASE_URL=http://localhost:3001
```

For Vercel, set `VITE_API_BASE_URL` to the deployed Render backend origin. If it is omitted or empty, frontend requests are made relative to the current origin.

Backend:

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
API_BASE=https://sofascore.p.rapidapi.com
RAPIDAPI_KEY=your-rapidapi-key
RAPIDAPI_HOST=sofascore.p.rapidapi.com
```

The backend also supports `TRANSFERMIND_PYTHON_BIN` for selecting a specific Python executable for the analysis runners. If it is not set, the K-Means and Apriori runners use `python3`, while the Agglomerative runner tries the default Python commands implemented in the backend.

Never commit real `.env` files or service keys.

## Local Development Setup

Install frontend dependencies:

```bash
cd frontend
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install Python dependencies for backend analysis scripts:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

From the repository root, create local environment files from the examples:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Then fill in the backend Supabase and RapidAPI values.

## Running the App Locally

Start the backend API:

```bash
cd backend
npm run dev
```

The backend defaults to port `3001` and exposes a health check at:

```text
GET /health
```

Start the frontend:

```bash
cd frontend
npm run dev
```

With the example frontend environment, the Vite app calls the local backend at `http://localhost:3001`.

## Available npm Scripts

Root:

- No root workflow scripts are defined.

Frontend, from `frontend/`:

- `npm run dev` - start the Vite development server.
- `npm run build` - run TypeScript compilation and build the production frontend.
- `npm run lint` - run ESLint for TypeScript/React files.
- `npm run preview` - preview the built frontend locally.

Backend, from `backend/`:

- `npm run dev` - start the Express server with Node watch mode.
- `npm start` - start the Express server.
- `npm run ingestion:init` - run the full initialization ingestion.
- `npm run ingestion:annual-season-reset` - refresh seasons, tournaments, standings for team discovery, missing teams, and missing logos.
- `npm run ingestion:monthly-player-stats-refresh` - refresh current-season player stats.
- `npm run ingestion:player-refresh` - refresh current-season players.
- `npm run ingestion:weekly-refresh` - refresh current-season standings and team stats.

`backend/package.json` also defines `npm run test:api`, but its target file is not present in the repository, so it should not be used until that script is restored or updated.

## Data Ingestion and Refresh Jobs

Backend ingestion scripts live in `backend/ingestion/`, with job entrypoints in `backend/jobs/`.

The supported job scripts are:

- `ingestion:init`: initial data load across seasons, tournaments, standings, teams, logos, team stats, players, and player stats.
- `ingestion:weekly-refresh`: current-season standings and team stats.
- `ingestion:monthly-player-stats-refresh`: current-season player stats.
- `ingestion:player-refresh`: current-season players.
- `ingestion:annual-season-reset`: July 1 season/tournament/team maintenance without deleting historical rows.

Refresh jobs use the backend Supabase and RapidAPI environment variables. Some scheduled workflows pass `--skip-fresh`, which enables freshness checks in the current job implementations.

## Machine Learning and Analysis Modules

The backend exposes analysis endpoints through the normal API route/controller/service flow:

- `POST /api/teams/clustering/elbow` for K-Means elbow analysis.
- `POST /api/teams/clustering/run` for K-Means clustering.
- `POST /api/teams/clustering/agglomerative/run` for Agglomerative clustering.
- `POST /api/team-season-stats/association-rules` for Apriori association rules.

Python runner scripts are stored in `backend/python/`:

- `kmeans_runner.py`
- `agglomerative_runner.py`
- `apriori_runner.py`

Install Python dependencies from `backend/requirements.txt` before using these endpoints locally or on Render.

## Deployment Notes

### Frontend on Vercel

- Deploy the `frontend/` app.
- Use `npm run build` as the production build command.
- Set `VITE_API_BASE_URL` to the deployed backend origin.
- `frontend/vercel.json` rewrites all routes to `index.html`, which allows direct refreshes on client-side routes such as `/standings`, `/teams`, `/players`, and `/teams-comparison` without Vercel returning a 404.

### Backend on Render

- Deploy the `backend/` service.
- Use `npm start` as the production start command.
- Configure all backend environment variables from `backend/.env.example`.
- Install the Python dependencies required by `backend/requirements.txt` so the clustering and Apriori endpoints can spawn their Python runners.
- Check `GET /health` after deployment.

## GitHub Actions

The repository includes scheduled and manual ingestion workflows in `.github/workflows/`:

- `manual-weekly-refresh.yml`: runs every Tuesday at `00:00` UTC and can be triggered manually. It executes `npm run ingestion:weekly-refresh -- --skip-fresh`.
- `manual-monthly-player-stats-refresh.yml`: runs on the first day of each month at `00:00` UTC and can be triggered manually. It executes `npm run ingestion:monthly-player-stats-refresh -- --skip-fresh`.
- `manual-player-refresh.yml`: runs on January 1, February 1, March 1, July 1, August 1, and October 1 at `00:00` UTC and can be triggered manually. It executes `npm run ingestion:player-refresh -- --skip-fresh`.
- `manual-annual-season-reset.yml`: runs on July 1 at `00:00` UTC and can be triggered manually. It executes `npm run ingestion:annual-season-reset`.

The workflows require these GitHub Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `API_BASE`
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`

## Troubleshooting

- Vercel returns 404 on page refresh: confirm `frontend/vercel.json` is deployed with the SPA rewrite to `/index.html`.
- Frontend cannot reach the API: check `VITE_API_BASE_URL` and confirm the backend `/health` endpoint responds.
- Backend fails on startup or ingestion: verify `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `API_BASE`, `RAPIDAPI_KEY`, and `RAPIDAPI_HOST` are configured in the backend environment.
- Clustering or association rules fail: verify Python is available to the backend process and the dependencies from `backend/requirements.txt` are installed. Set `TRANSFERMIND_PYTHON_BIN` if the backend should use a specific Python executable.
- `npm run test:api` fails: the script points to `backend/api/fetchTest.js`, which is not currently present.
