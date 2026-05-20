# Deployment and GitHub Actions Guide

This guide explains how to prepare, deploy, and later automate the TransferMind thesis project.

TransferMind has four main parts:

- A React/Vite frontend.
- An Express backend.
- Python and Node ingestion scripts.
- A Supabase/PostgreSQL database.

The recommended deployment path is:

- Frontend on Vercel.
- Backend on Render.
- Database on Supabase/PostgreSQL.
- GitHub Actions later for manual and scheduled ingestion jobs.

Important: do not create real `.github/workflows` files yet. First document and test the project manually. Add GitHub Actions only after deployment is stable.

## 1. Overview

### Deployment

Deployment means putting the app online so other people can use it outside your local computer.

For this project:

- Vercel will host the frontend website.
- Render will host the backend API.
- Supabase will host the PostgreSQL database.

### GitHub Actions

GitHub Actions is GitHub's automation system. It can run commands when you click a button, push code, or on a schedule.

For this project, GitHub Actions should eventually run ingestion and refresh jobs, but only after they have been tested manually.

Start with manual `workflow_dispatch` actions later. Add scheduled cron automation only after manual runs are reliable.

### Environment Variables

Environment variables are configuration values stored outside the code.

Examples:

- Supabase URL.
- Supabase service key.
- RapidAPI key.
- Backend API URL used by the frontend.
- Allowed CORS origins.

Secrets must never be committed to GitHub. Keep them in local `.env` files, Render environment settings, Vercel environment settings, Supabase settings, or GitHub Secrets.

### Production vs Local Development

Local development means running the project on your machine, usually with URLs such as:

- `http://localhost:5173` for Vite frontend.
- `http://localhost:3000` or another local port for the backend.

Production means the deployed public version:

- A Vercel URL for the frontend.
- A Render URL for the backend.
- The Supabase project used by the deployed backend.

Code should support both local and production environments through environment variables.

## 2. Recommended Architecture

Use this architecture:

| Part | Platform | Purpose |
| --- | --- | --- |
| Frontend | Vercel | Hosts the React/Vite app. |
| Backend | Render | Hosts the Express API. |
| Database | Supabase/PostgreSQL | Stores football data and app data. |
| Future ingestion automation | GitHub Actions | Runs refresh scripts manually first, then on schedules later. |

The frontend should call the backend API. It should not connect directly to Supabase.

The backend should connect to Supabase and handle all database access.

Ingestion scripts can use backend environment variables and Supabase credentials, but secrets must stay outside the repository.

## 3. Phase 1: Pre-deployment Checklist

Before deploying anything, verify the project is ready.

Keep this phase small. The goal is to inspect and document readiness, not to make large changes.

Check:

- The project runs locally.
- The backend runs locally with `npm run dev` from `backend/`.
- The frontend runs locally with `npm run dev` from `frontend/`.
- The Python virtual environment works.
- `requirements.txt` exists if Python scripts need third-party packages.
- The frontend uses an environment variable for the backend API URL.
- The backend has CORS configured.
- `.env` files are not committed.
- `.gitignore` contains `.env` patterns.
- Backend package scripts exist for development and production.
- Frontend package scripts exist for build and development.

Useful local commands:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

```bash
git status --short
```

Codex prompt:

```text
Inspect the repository and create a deployment readiness report. Check frontend env usage, backend env usage, CORS setup, Python dependency files, start/build scripts, and whether secrets are safely ignored. Do not change code yet. Write findings to docs/deployment-readiness-report.md.
```

## 4. Phase 2: Backend Production Readiness

Render needs to know how to build and start the backend.

You need to identify:

- Backend root directory, usually `backend/`.
- Build command, if needed.
- Start command.
- Required environment variables.
- Whether Python dependencies are needed in production.
- Whether the backend has a health check endpoint.

Typical Render settings may look like:

| Setting | Example |
| --- | --- |
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/health` |

The backend should expose a simple endpoint such as:

```text
GET /health
```

This endpoint should return a basic successful response if the server is running. It should not expose secrets.

Render environment variables may include:

- `NODE_ENV=production`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`, if the backend uses it
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`
- `CORS_ORIGINS`
- Any ingestion-specific settings used by backend scripts

Do not guess final variable names. Inspect the repository first.

Codex prompt:

```text
Prepare the backend for Render deployment. Inspect package.json scripts, backend entry point, Python script usage, requirements.txt, and environment variable names. Add or update a simple GET /health endpoint if missing. Add a production-safe start script if missing. Do not change API behavior. Document required Render settings in docs/render-backend-settings.md.
```

## 5. Phase 3: Frontend Production Readiness

Vercel needs to know how to build the frontend and where the built files are.

You need to identify:

- Frontend root directory, usually `frontend/`.
- Build command, usually `npm run build`.
- Framework detection, usually Vite.
- Output directory, usually `dist`.
- The environment variable used for the backend API URL.

For Vite, public frontend environment variables usually use the `VITE_` prefix. Some projects use names like `NEXT_PUBLIC_API_URL` for Next.js, but this project should use the naming pattern that matches its framework and existing code.

Example:

```text
VITE_API_BASE_URL=https://your-render-backend.onrender.com
```

The exact name should match the frontend code.

The frontend should not contain hardcoded production or localhost backend URLs in API calls.

Codex prompt:

```text
Prepare the frontend for Vercel deployment. Inspect how API calls are made. Ensure the frontend uses a single environment variable for the backend API base URL instead of hardcoded localhost URLs. Do not break local development. Document required Vercel environment variables in docs/vercel-frontend-settings.md.
```

## 6. Phase 4: Deploy Backend on Render

Manual steps:

1. Create a Render account.
2. Click **New**.
3. Choose **Web Service**.
4. Connect the GitHub repository.
5. Select the TransferMind repository.
6. Set the root directory to the backend folder, usually `backend`.
7. Set the build command.
8. Set the start command.
9. Add all required environment variables.
10. Deploy the service.
11. Wait for the first build to finish.
12. Open the Render service URL.
13. Test the health endpoint:

```text
https://your-render-service.onrender.com/health
```

14. Copy the backend production URL.

Save the backend URL because the frontend will need it.

## 7. Phase 5: Deploy Frontend on Vercel

Manual steps:

1. Create a Vercel account.
2. Click **Add New Project**.
3. Import the GitHub repository.
4. Choose the frontend folder as the project root, usually `frontend`.
5. Confirm that Vercel detects Vite.
6. Set the build command, usually `npm run build`.
7. Confirm the output directory, usually `dist`.
8. Add the frontend environment variable for the backend API URL.
9. Set the value to the Render backend production URL.
10. Deploy the project.
11. Open the Vercel URL in a browser.
12. Test pages that call the backend.

Example frontend environment variable:

```text
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Use the actual variable name from the codebase.

## 8. Phase 6: Connect Frontend and Backend

After both deployments exist, make sure they can talk to each other.

Check:

- CORS allows the deployed Vercel domain.
- CORS still allows local development.
- The frontend API URL points to the Render backend.
- The backend can access Supabase.
- Backend environment variables are configured on Render.
- Python scripts run in production if they are needed by backend commands.
- No secrets are visible in browser code or GitHub.

CORS should be configured through environment variables. Avoid hardcoding only one production domain because Vercel may create preview URLs.

Recommended approach:

```text
CORS_ORIGINS=http://localhost:5173,https://your-project.vercel.app
```

Codex prompt:

```text
Add a production CORS configuration that supports local development and the deployed Vercel frontend URL through environment variables. Do not hardcode only one domain. Document the required variables and examples.
```

## 9. Phase 7: GitHub Actions Readiness

GitHub Actions should come after deployment is stable.

Start with manual runs:

- Use `workflow_dispatch` first.
- Trigger jobs manually from the GitHub Actions tab.
- Check logs carefully.
- Confirm that jobs do not fetch too much data.
- Confirm that jobs do not expose secrets.

Add schedules later:

- Use cron only after manual jobs are safe.
- GitHub Actions cron uses UTC, not Europe/Athens time.
- Europe/Athens is UTC+2 in winter and UTC+3 during daylight saving time.
- If the operation is planned for midnight Europe/Athens, calculate the correct UTC cron carefully.

Use GitHub Secrets for:

- Supabase URL.
- Supabase service role key.
- RapidAPI key.
- RapidAPI host.
- Any other production-only secret.

Safe testing rules:

- Test with manual dispatch first.
- Prefer scripts that support `--skip-fresh` only when you intentionally want to bypass freshness checks.
- Watch GitHub Actions logs.
- Watch Supabase data changes.
- Avoid broad bulk fetches until the manual workflow is proven.

Codex prompt:

```text
Create docs/github-actions-ingestion-readiness-plan.md. Document future GitHub Actions jobs for backend ingestion scripts. Include manual workflow_dispatch testing first, then scheduled cron later. Use Europe/Athens as operational time and include UTC cron equivalents. Do not create real workflow files yet.
```

## 10. Phase 8: Optional Real GitHub Actions Workflows

This phase is optional and should happen later, after manual deployment works.

Do not add workflow files during early deployment preparation.

When ready, create workflows under:

```text
.github/workflows/
```

Example workflow structure:

```yaml
name: Manual Weekly Ingestion Refresh

on:
  workflow_dispatch:

jobs:
  weekly-refresh:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run ingestion:weekly-refresh -- --skip-fresh
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          RAPIDAPI_KEY: ${{ secrets.RAPIDAPI_KEY }}
          RAPIDAPI_HOST: ${{ secrets.RAPIDAPI_HOST }}
```

Future commands that may need manual workflows:

```bash
npm run ingestion:weekly-refresh -- --skip-fresh
npm run ingestion:monthly-player-stats-refresh -- --skip-fresh
npm run ingestion:annual-season-reset
npm run ingestion:player-refresh -- --skip-fresh
```

If Python dependencies are required, the workflow should also:

- Set up Python.
- Install dependencies from `requirements.txt`.
- Use GitHub Secrets for environment variables.
- Never hardcode secrets.

Codex prompt:

```text
After deployment is stable, create GitHub Actions workflow files for manual ingestion runs only using workflow_dispatch. Each workflow must run from backend/, install Node dependencies, install Python dependencies if needed, use GitHub secrets for env variables, and never hardcode secrets.
```

## 11. Troubleshooting

### CORS Error

Symptoms:

- The frontend loads, but API calls fail in the browser.
- Browser console mentions CORS.

Check:

- The Vercel domain is listed in backend CORS settings.
- Localhost is still allowed for local development.
- The deployed backend was restarted after changing environment variables.

### Missing Environment Variable

Symptoms:

- Render logs show missing config.
- Vercel build fails.
- API calls return server errors.

Check:

- The variable exists in the correct platform.
- The variable name exactly matches the code.
- The value does not contain accidental spaces.
- The service was redeployed after adding the variable.

### Python Module Not Found

Symptoms:

- A Python script fails with `ModuleNotFoundError`.

Check:

- `requirements.txt` exists.
- The deployment or workflow installs Python dependencies.
- The correct Python version is used.
- The script runs from the expected directory.

### Render Build Failed

Symptoms:

- Render deploy stops during install or build.

Check:

- The root directory is `backend`.
- The build command is correct.
- `package.json` exists in the selected root directory.
- Required Node version is supported.
- Required environment variables are present.

### Frontend Still Calls Localhost

Symptoms:

- Browser network tab shows requests to `localhost`.

Check:

- The frontend API base URL uses an environment variable.
- The Vercel environment variable is set.
- The frontend was redeployed after changing the variable.
- There are no hardcoded localhost URLs in frontend API files.

### Supabase Connection Failed

Symptoms:

- Backend starts, but database requests fail.

Check:

- Supabase URL is correct.
- Supabase key is correct.
- The backend is using the correct production environment variables.
- Supabase project is active.
- Row-level security and service key usage are appropriate for backend-only access.

### Scheduled Action Did Not Run

Symptoms:

- A future scheduled GitHub Action does not start.

Check:

- The workflow file is on the default branch.
- The cron expression is valid.
- The cron time is UTC.
- GitHub Actions is enabled for the repository.
- The repository has not been inactive long enough for schedules to pause.

## 12. Final Verification Checklist

Before considering deployment complete, verify:

- [ ] Frontend loads on Vercel.
- [ ] Backend `/health` works on Render.
- [ ] Frontend can call the backend.
- [ ] Backend can call Supabase.
- [ ] Teams Comparison still works.
- [ ] Clustering still works.
- [ ] Apriori still works.
- [ ] Ingestion scripts still run manually when needed.
- [ ] Python environment is documented and reproducible.
- [ ] No `.env` files are committed.
- [ ] No secrets are committed.
- [ ] `.gitignore` ignores local environment files.
- [ ] README has deployment notes or links to this guide.
- [ ] GitHub Actions are documented before any scheduled automation is added.
