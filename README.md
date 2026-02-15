## ✅ Step-by-step Guide (Roadmap to Final Product)

This roadmap takes the project from “local pipeline working” to a hosted, automated, prediction-powered product.

---

## Phase 0 — 📦 Data Ingestion & Refresh Architecture

This document describes the ingestion strategy, refresh logic, freshness tracking, execution modes, and cronjob planning for the TransferMind backend.

---

# 1️⃣ Seasons `is_current` Logic

## 🎯 Goal

Add an `is_current` flag in the `seasons` table and use it across all ingestion scripts to:

- Avoid unnecessary API calls
- Fetch stats only for active seasons
- Improve efficiency during cronjobs
- Prevent redundant bootstrap requests

## ✅ Requirements

- Only one season per `tournament_id` must have `is_current = true`
- Must work even if the table is empty (first bootstrap run)
- On July 1st refresh, re-evaluate and update `is_current`

## 🧠 Usage

All stats-related ingestion scripts must use:

```js
const currentSeasons = await getCurrentSeasonsFromDb();
```

Stats are fetched **only for current seasons**.

---

# 2️⃣ Transfer History Script

## 🎯 Goal

Create a `transfer-history` ingestion script to:

- Retrieve historical `team_id` for players
- Store past team associations
- Allow fetching stats correctly for previous seasons

## 🔍 Why?

We store:

- Players
- Stats per season

But we may not know the correct team for past seasons.

Using transfer history:

- We map player → team → season properly
- We fetch historical stats only if needed

## 🚀 Strategy

Transfer history is NOT fetched for all players at bootstrap.

Instead:

- Fetch on-demand
- Cache in DB
- Call API only if missing

This protects the monthly Sofascore request quota.

---

# 3️⃣ Execution Modes

We introduce operational modes to control ingestion behavior.

---

## 🅰️ Mode: `init` (Bootstrap)

Used when:

- Filling the database for the first time

Behavior:

- Fetch all tournaments
- Fetch all teams
- Fetch all seasons
- Fetch all players
- Fetch stats ONLY for current seasons
- Ignore freshness rules

⚠️ Historical stats are NOT fetched during bootstrap.

Example:

```bash
node backend/scripts/bootstrap.js
```

---

## 🅱️ Mode: `cron`

Used for scheduled updates.

Behavior:

- Update only current seasons
- Respect freshness rules
- Skip unchanged entities
- Refresh stats only for `is_current = true`

Example:

```bash
node backend/scripts/cronUpdate.js
```

---

## 🅾️ Mode: `on-demand`

Used when:

- A user requests specific data from the UI

Examples:

- Viewing standings for past season
- Viewing player stats for season 22/23
- Viewing team stats for historical season

Behavior:

- Fetch only requested entity
- Fetch only requested season
- Check freshness first
- Update selectively
- Store result in DB for future reuse

Example API:

```
GET /api/refresh/player/:id?season=2022
GET /api/refresh/standings?tournament=17&season=2022
```

This ensures:

- No unnecessary bulk fetching
- API calls scale with actual user usage

---

# 4️⃣ Database Logging

## 🎯 Goal

Track ingestion activity and API usage.

## 📦 Table: `ingestion_logs`

```sql
ingestion_logs (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT,
  entity_id BIGINT,
  season_id BIGINT,
  mode TEXT,
  api_requests_used INTEGER,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  status TEXT,
  error_message TEXT
);
```

## 💡 Benefits

- Track Sofascore request usage
- Monitor bootstrap load
- Debug failures
- Prevent quota overuse

---

# 5️⃣ Freshness Tracking

## 🎯 Goal

Track `last_fetched_at` per entity + season to avoid unnecessary refreshes.

## 📦 Table: `entity_freshness`

```sql
entity_freshness (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  season_id BIGINT,
  last_fetched_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🧠 Freshness Policy (`backend/config/freshness.js`)

```js
export const FRESHNESS_RULES = {
  player: { maxAgeHours: 24 * 7 },
  team: { maxAgeHours: 24 * 3 },
  standings: { maxAgeHours: 24 },
  player_stats: { maxAgeHours: 24 },
  team_stats: { maxAgeHours: 24 },
};
```

## 🔄 Logic

Before fetching:

```js
if (!isStale(entityType, entityId, seasonId)) {
  return; // Skip API call
}
```

---

# 6️⃣ Cronjob Strategy (GitHub Actions)

## Weekly (Every Monday)

Update:

- player_stats (current season only)
- team_stats (current season only)
- standings (current season only)

```yaml
schedule:
  - cron: "0 3 * * 1"
```

---

## Transfer Window Updates

Update:

- players

Periods:

- Early October
- Late February

Manual trigger or specific cron expression.

---

## July 1st (Season Reset)

Update:

- tournaments
- teams
- seasons

Recalculate:

- `is_current`

```yaml
schedule:
  - cron: "0 2 1 7 *"
```

---

# 🧱 Suggested Folder Architecture

```
backend/
│
├── ingestion/
│   ├── players.js
│   ├── teams.js
│   ├── seasons.js
│   ├── playerStats.js
│   ├── teamStats.js
│   ├── standings.js
│   ├── transferHistory.js
│
├── jobs/
│   ├── bootstrap.js
│   ├── cronUpdate.js
│
├── api/
│   ├── refreshPlayer.js
│   ├── refreshTeam.js
│   ├── refreshStandings.js
│
├── lib/
│   ├── freshness.js
│   ├── logger.js
│   ├── apiClient.js
│
├── config/
│   ├── freshness.js
```

---

# 🧠 Architecture Philosophy

- Bootstrap = structure only + current stats
- Cron = maintain current season
- On-demand = unlock historical data dynamically
- Freshness = API quota protection
- Logging = observability
- `is_current` = performance optimization

---

# 📊 Architecture Goals

- Minimize Sofascore API usage
- Avoid redundant calls
- Scale to 4,000+ players
- Fetch historical data only when needed
- Prepare clean foundation for ML layer

---

## Phase 1 — Production-Grade Ingestion (Local)

4. Create orchestrator:

   backend/jobs/monthlyRefresh.js
   - Runs all ingestion scripts in correct order
   - Handles errors centrally
   - Exits with code `0` (success) or `1` (failure)

5. Add:
   - Retry + exponential backoff
   - Rate limiting for Sofascore API
   - Structured logging per step

6. Add post-ingestion data validation:
   - Duplicate detection
   - Missing foreign keys
   - Abnormal drop/spike checks
   - Coverage % validation

**Output:** pipeline is stable and deterministic.

---

## Phase 2 — Observability

7. Create `job_runs` table:
   - job_name
   - started_at
   - ended_at
   - status
   - rows_upserted
   - errors_count
   - duration_ms
   - meta (jsonb)

8. Update `monthlyRefresh.js`:
   - Insert row at start
   - Update on success/failure
   - Store error samples

**Output:** full visibility into ingestion health.

---

## Phase 3.1 — Monthly Automation (Cloud Cron)

9. Add GitHub Actions workflow:

   .github/workflows/monthly-refresh.yml
   - Scheduled monthly
   - Manual trigger enabled

10. Add GitHub Secrets:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SOFASCORE_API_KEY (if applicable)

11. Manually test workflow once.

**Output:** automated monthly ingestion.

---

## Phase 3.2 — On-demand Refresh System

TransferMind supports:

1. Scheduled monthly refresh
2. On-demand refresh triggered by UI

### A. Freshness Tracking

12. Add metadata to canonical entities:

- last_fetched_at
- fetch_status
- fetch_error (optional)

13. Define freshness rules:

- player stats → 7 days
- team stats → 3 days
- standings → 24 hours

**Output:** system knows what is stale.

---

### B. Refresh Queue

14. Create `refresh_queue` table:

- entity_type (player/team/standings)
- entity_id
- tournament_id
- season_id
- priority
- status (queued/running/done/failed)
- requested_at
- started_at
- finished_at
- error

15. Add deduplication:

- If entity already queued or running → skip
- If recently refreshed → skip

**Output:** controlled, cost-efficient refresh system.

---

### C. Refresh API Endpoints

16. Create endpoints:

- POST /api/refresh/player/:id
- POST /api/refresh/team/:id
- POST /api/refresh/standings

17. Endpoint logic:

- Validate input
- Check freshness
- Enqueue refresh job
- Return refresh_job_id

**Output:** UI triggers refresh safely.

---

### D. Worker

18. Create:

backend/jobs/workerRefreshQueue.js

19. Worker:

- Fetch highest priority queued job
- Mark as running
- Execute correct ingestion script
- Update status + last_fetched_at

20. Run worker:

- Hosted server (ideal), OR
- GitHub Actions every 5–10 minutes

**Output:** asynchronous refresh processing.

---

### E. UI Pattern — Stale-While-Revalidate

21. On page load:

- Fetch current data from Supabase views
- If stale → trigger refresh in background

22. UI shows:

- Last updated timestamp
- “Updating…” indicator
- Auto-refresh when done

**Output:** fast UX + fresh data without excessive API calls.

---

## Phase 4 — Database Contract (Silver Layer)

23. Define grain for each canonical table.

Example:
player_stats grain =
(player_id, team_id, tournament_id, season_id)

24. Add composite unique constraints.
25. Ensure correct upsert logic.
26. Standardize null handling.

**Output:** data integrity guaranteed.

---

## Phase 5 — Analytics Layer (Gold Views)

27. Create analytics views:

- v_player_season_summary
- v_player_form_last_n
- v_team_strength
- v_league_strength

28. Create:

- v_transfer_features_base

29. UI + ML read from views only.

**Output:** clean contract layer.

---

## Phase 6 — Prediction System

30. Define label:

- Performance delta OR projected performance.

31. Create:
    ml_transfer_samples
    (1 row = 1 historical transfer event)

32. Implement baseline predictor:

- per90 normalization
- league difficulty adjustment
- minutes reliability penalty
- similarity search

33. Train ML model (v1):

- Season-based split
- Evaluate metrics
- Save artifact

34. Add inference endpoint:

- Compute features
- Run model
- Fallback to baseline if needed

35. Add explainability:

- Confidence score
- Top drivers
- Comparable transfers

**Output:** reliable and interpretable predictions.

---

## Phase 7 — Frontend MVP

36. Build 3 screens:

- Player Search
- Player Profile
- Transfer Simulation

37. Show:

- Current (yellow)
- Predicted (blue)
- Confidence
- Last refresh time

**Output:** complete demo-ready application.

---

## Phase 8 — Hosting

38. Deploy frontend on Vercel.
39. Keep ingestion in GitHub Actions.
40. Choose:

- Direct Supabase access OR
- API layer mediation

**Output:** publicly accessible product.

---

## Phase 9 — Final Polish

41. Add:

- Architecture diagram
- Schema documentation
- Pipeline explanation
- Screenshots
- Demo video (optional)

42. Add guardrails:

- Health endpoints
- Clear error handling
- “Insufficient data” messaging

**Output:** final thesis-grade, portfolio-ready system.
