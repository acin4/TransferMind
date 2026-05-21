# Render Backend Settings

Use these settings for the TransferMind backend Render Web Service.

## Service Settings

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Runtime | Node |
| Root directory | `backend` |
| Build command | `npm ci && python3 -m pip install -r requirements.txt` |
| Start command | `npm start` |
| Health check path | `/health` |

`backend/package.json` already defines `npm start` as `node index.js`, which is suitable for production. The development script uses watch mode and should not be used as the Render start command.

The backend has a simple health endpoint at `GET /health`, returning a JSON success envelope without exposing secrets.

## Environment Variables

Set these in Render's environment tab:

| Name | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | Yes | Use `production`. |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_SERVICE_KEY` | Yes | Backend service key used by `backend/lib/supabaseClient.js`. Do not use this in frontend code. |
| `API_BASE` | Required for ingestion scripts | Current local example uses `https://sofascore.p.rapidapi.com`. |
| `RAPIDAPI_KEY` | Required for ingestion scripts | Secret RapidAPI key. |
| `RAPIDAPI_HOST` | Required for ingestion scripts | Current local example uses `sofascore.p.rapidapi.com`. |
| `TRANSFERMIND_PYTHON_BIN` | Optional | Set only if Render's Python executable is not available as `python3`, for example `/usr/bin/python3`. |

Do not manually set `PORT` unless Render requires it for a specific service configuration. Render provides the port at runtime, and `backend/index.js` reads `process.env.PORT` with a local fallback of `3001`.

`backend/.env.example` currently includes `CORS_ORIGIN`, but the backend entry point uses `cors({ origin: true })` and does not read that variable. Do not rely on `CORS_ORIGIN` as a production control until the backend CORS code is intentionally changed.

## Python Runtime Notes

The backend API can spawn Python scripts for team clustering and association-rule analysis:

- `backend/python/kmeans_runner.py`
- `backend/python/agglomerative_runner.py`
- `backend/python/apriori_runner.py`

Install Python dependencies from the pinned `backend/requirements.txt`. There is also an unpinned `backend/python/requirements.txt`, but the pinned file is the safer deployment source.

If the Render Node runtime cannot install or run these Python packages reliably, use a Docker-based Render service or another Render environment that includes Python 3 and pip.

## Smoke Check

After deployment, confirm the service is up:

```text
GET https://your-render-service.onrender.com/health
```

Expected shape:

```json
{
  "data": {
    "status": "ok"
  }
}
```
