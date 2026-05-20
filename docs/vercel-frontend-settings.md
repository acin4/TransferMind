# Vercel Frontend Settings

Use these settings for the TransferMind frontend Vercel project.

## Project Settings

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm ci` |

## Environment Variables

Set this variable in Vercel for Production, Preview, and Development unless you intentionally want an environment to call a different backend.

| Name | Required | Value |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | The deployed backend origin, for example `https://your-render-service.onrender.com`. |

Do not include a trailing `/api` path in `VITE_API_BASE_URL`. Frontend API functions already append paths such as `/api/teams`, so the value should be only the backend origin.

Do not add Supabase URLs, Supabase keys, RapidAPI keys, or backend service keys to Vercel frontend environment variables. The frontend should call the backend API only.

## Local Development

For local development, create `frontend/.env` from `frontend/.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:3001
```

The backend must still be running separately, usually with:

```bash
cd backend
npm run dev
```

## Smoke Check

After deploying the backend and frontend:

- Visit the Vercel frontend URL.
- Confirm list pages and profile pages load data.
- Confirm the browser network tab shows requests going to the Render backend origin from `VITE_API_BASE_URL`.
- Confirm no frontend request goes directly to Supabase.
