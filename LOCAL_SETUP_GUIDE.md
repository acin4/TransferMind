# Local Setup Guide

This guide explains how to clone TransferMind on a new computer and run the backend and frontend locally on Windows or macOS.

TransferMind has two separate Node.js apps:

- `backend/`: Express API, Supabase access, ingestion scripts, and Python-backed clustering.
- `frontend/`: React, TypeScript, and Vite UI.

The repository root currently does not define workflow scripts, so run commands from `backend/` or `frontend/` as shown below.

## 1. Prerequisites

### Windows

Install these before cloning the repository:

- Git
- Node.js LTS
- npm, included with Node.js
- VS Code
- A terminal such as PowerShell, Git Bash, or the VS Code terminal
- Python 3 and `pip`, required for the backend K-Means cluster analysis endpoint
- Supabase account/project access, because the backend connects to Supabase
- RapidAPI/Sofascore API credentials, required for ingestion scripts

Recommended checks:

```bash
git --version
node --version
npm --version
python --version
pip --version
```

### macOS

Install these before cloning the repository:

- Git
- Node.js LTS
- npm, included with Node.js
- VS Code
- Terminal
- Homebrew, optional but recommended for installing tools
- Python 3 and `pip`, required for the backend K-Means cluster analysis endpoint
- Supabase account/project access, because the backend connects to Supabase
- RapidAPI/Sofascore API credentials, required for ingestion scripts

Recommended checks:

```bash
git --version
node --version
npm --version
python3 --version
python3 -m pip --version
```

Optional macOS install examples:

```bash
brew install git node python
```

## 2. Clone the Repository

Use the real repository URL provided by the project owner.

```bash
git clone <REPOSITORY_URL>
cd <REPOSITORY_FOLDER>
```

## 3. Install Dependencies

Install backend and frontend dependencies separately.

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

The backend also uses Python for cluster analysis. From `backend/`, create and activate a virtual environment, then install the Python requirements.

macOS:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If PowerShell blocks virtual environment activation, run PowerShell as your user and allow local scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## 4. Environment Variables

The project needs local environment files. Do not commit real `.env` files or secrets.

### Backend Environment

Create:

```text
backend/.env
```

Start from the existing example:

```bash
cd backend
cp .env.example .env
```

On Windows PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

Expected variables from `backend/.env.example`:

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-supabase-service-key>
API_BASE=https://sofascore.p.rapidapi.com
RAPIDAPI_KEY=<your-rapidapi-key>
RAPIDAPI_HOST=sofascore.p.rapidapi.com
```

Variable meanings:

- `PORT`: local backend port. The backend defaults to `3001` if this is missing.
- `CORS_ORIGIN`: intended local frontend origin. The current backend code allows origins dynamically, but keep this value aligned with the frontend dev server.
- `SUPABASE_URL`: Supabase project URL. Get this from Supabase project settings.
- `SUPABASE_SERVICE_KEY`: Supabase service role key used by backend repository and ingestion code. Ask the project owner for this value/configuration.
- `API_BASE`: RapidAPI Sofascore API base URL.
- `RAPIDAPI_KEY`: RapidAPI key for Sofascore requests. Ask the project owner for this value/configuration.
- `RAPIDAPI_HOST`: RapidAPI host header for Sofascore.

Optional backend variable:

```env
TRANSFERMIND_PYTHON_BIN=<path-to-python>
```

Use this if the backend cannot find Python for cluster analysis. On macOS this often works without setting anything because the backend defaults to `python3`. On Windows, set it to the virtual environment Python path if needed:

```env
TRANSFERMIND_PYTHON_BIN=.\\.venv\\Scripts\\python.exe
```

### Frontend Environment

Create:

```text
frontend/.env
```

Start from the existing example:

```bash
cd frontend
cp .env.example .env
```

On Windows PowerShell:

```powershell
cd frontend
Copy-Item .env.example .env
```

Expected variable from `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Variable meaning:

- `VITE_API_BASE_URL`: backend API base URL used by the frontend API gateway in `frontend/src/api/api.ts`.

## 5. Database / Supabase Setup

The backend connects to Supabase using `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from `backend/.env`.

The repository contains Supabase configuration and migrations:

- `supabase/config.toml`
- `supabase/migrations/`

The app expects football data tables, views, and ingestion logging tables to exist in Supabase. Existing migrations include schema setup and views such as current seasons, current season teams, standings, and ingestion logging.

For the simplest local setup, ask the project owner for access to the existing Supabase project and the correct `SUPABASE_URL` and service role key.

A new Supabase project may be possible, but it must have the schema from `supabase/migrations/` and enough football data for the UI to be useful. The repository does not include a complete seed dataset. Ask the project owner for this value/configuration.

The repository has a Supabase local config, but there are no npm scripts that start or reset a local Supabase instance. If you want to use Supabase CLI locally, install the Supabase CLI separately and coordinate with the project owner before running migrations or ingestion against a new database.

## 6. Running the Project Locally

Use two terminals.

Terminal 1, backend:

```bash
cd backend
npm run dev
```

The backend listens on:

```text
http://localhost:3001
```

Health check:

```text
http://localhost:3001/health
```

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

Vite usually starts the frontend at:

```text
http://localhost:5173
```

If port `5173` is already in use, Vite may choose another port. Use the URL printed in the terminal.

Useful frontend commands:

```bash
cd frontend
npm run lint
npm run build
npm run preview
```

Useful backend commands:

```bash
cd backend
npm start
npm run test:api
```

Note: `npm run test:api` is defined as `node api/fetchTest.js`, but this file was not present when this guide was written. Verify the file exists before relying on that command.

## 7. Optional Data Ingestion / Refresh Scripts

Ingestion scripts live in `backend/ingestion/`. These scripts write to Supabase and can consume RapidAPI/Sofascore quota. Do not run them casually.

The package script is:

```bash
cd backend
npm run ingestion:init
```

This runs `backend/ingestion/initIngestion.js`, which performs an init/bootstrap flow:

- fetches recent seasons
- fetches tournament metadata
- fetches standings for database seasons
- fetches teams
- fetches missing or changed team logos
- fetches team stats
- fetches current-season players
- fetches current-season player stats
- writes ingestion logs and freshness records

Only run this when initializing or intentionally refreshing the database. Ask the project owner before running it against a shared Supabase project.

The following ingestion files are also directly runnable with Node because they contain command-line entry points:

```bash
cd backend
node ingestion/fetchSeasons.js
node ingestion/fetchTournaments.js
node ingestion/fetchStandings.js
node ingestion/fetchTeams.js
node ingestion/fetchTeamLogos.js
node ingestion/fetchAllTeamStats.js
node ingestion/fetchPlayers.js
node ingestion/fetchAllPlayerStats.js
```

What they do:

- `fetchSeasons.js`: fetches season records.
- `fetchTournaments.js`: fetches tournament metadata.
- `fetchStandings.js`: fetches standings data.
- `fetchTeams.js`: fetches team records.
- `fetchTeamLogos.js`: fetches missing or changed team logos.
- `fetchAllTeamStats.js`: fetches team statistics.
- `fetchPlayers.js`: fetches player records.
- `fetchAllPlayerStats.js`: fetches player statistics.

These scripts require valid `SUPABASE_*` and `RAPIDAPI_*` values in `backend/.env`.

## 8. Common Issues

### `npm install` fails

Check that Node.js LTS and npm are installed. Delete `node_modules` only if needed, then run `npm install` again from the correct folder.

### Wrong Node.js version

Use Node.js LTS. If you use a version manager, switch to an LTS version before installing dependencies.

### Missing `.env` variables

Copy `.env.example` to `.env` in both `backend/` and `frontend/`. Fill in placeholders with real values from Supabase, RapidAPI, or the project owner.

### Backend cannot connect to Supabase

Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. Make sure the Supabase project has the expected schema and data.

### Frontend cannot reach backend

Make sure the backend is running on the same URL configured in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Also check that the backend health route works:

```text
http://localhost:3001/health
```

### Port already in use

If `3001` is busy, change `PORT` in `backend/.env` and update `VITE_API_BASE_URL` in `frontend/.env` to match.

If `5173` is busy, use the frontend URL printed by Vite.

### Cluster analysis fails

Install Python dependencies from `backend/requirements.txt`. If the backend cannot find Python, set `TRANSFERMIND_PYTHON_BIN` in `backend/.env`.

### API quota or rate-limit errors

Ingestion scripts call RapidAPI/Sofascore and may hit quota or rate limits. Stop broad ingestion runs and ask the project owner before retrying.

### Windows path or terminal issues

Use PowerShell, Git Bash, or the VS Code terminal consistently. If Python virtual environment activation fails in PowerShell, update the execution policy for the current user.

### macOS permission issues

Avoid using `sudo npm install` inside the project. If npm permissions are broken globally, fix the Node/npm installation or use a Node version manager.

## 9. Recommended Development Workflow

Before starting work:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/my-task
```

During development:

- Pull latest changes before starting work.
- Create or switch to the correct Git branch.
- Run `npm install` again after `package.json` or `package-lock.json` changes.
- Keep `.env` files private.
- Do not commit secrets, Supabase keys, RapidAPI keys, or local credentials.
- Commit focused, meaningful changes.

## 10. Final Checklist

- [ ] Git installed
- [ ] Node.js LTS installed
- [ ] npm installed
- [ ] Python 3 installed
- [ ] Repository cloned
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Python backend dependencies installed
- [ ] `backend/.env` created
- [ ] `frontend/.env` created
- [ ] Supabase credentials added
- [ ] RapidAPI/Sofascore credentials added if running ingestion
- [ ] Backend running
- [ ] Frontend running
- [ ] App opens locally
