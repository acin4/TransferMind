// backend/lib/freshness.js
import { supabase } from "./supabaseClient.js";

/**
 * We store freshness in a generic table:
 * entity_freshness(entity_type, entity_key, last_fetched_at, status, error, updated_at)
 *
 * entity_type maps to your DB tables / logical datasets.
 * entity_key is a stable string, used for both "all" refreshes and granular ones.
 */

// ---- Supported entity types (aligns with your schema) ----
export const ENTITY_TYPES = {
  PLAYERS: "players",
  TEAMS: "teams",
  TOURNAMENTS: "tournaments",
  SEASONS: "seasons",
  STANDINGS: "standings",
  TEAM_LOGOS: "team_logos",
  PLAYER_STATS: "player_stats",
  TEAM_STATS: "team_stats",
};

// ---- Key builders ----

/**
 * Stable key format:
 *   <entity_type>:<k1>=<v1>:<k2>=<v2>...  (keys sorted alphabetically)
 *
 * Example:
 *   standings:season_id=2024:tournament_id=17
 *   player_stats:player_id=123:season_id=2024:tournament_id=17:team_id=555
 */
function keyFromParts(entityType, parts = {}) {
  const entries = Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) return `${entityType}:all`;

  const suffix = entries.map(([k, v]) => `${k}=${v}`).join(":");
  return `${entityType}:${suffix}`;
}

/**
 * Public helper for building keys per schema use-case.
 * You can use either:
 * - collection-level keys (":all") for full refresh tables
 * - granular keys for on-demand refresh of stats
 */
export function makeEntityKey(entityType, params = {}) {
  switch (entityType) {
    // Collection refresh (usually "all")
    case ENTITY_TYPES.PLAYERS:
    case ENTITY_TYPES.TEAMS:
    case ENTITY_TYPES.TOURNAMENTS:
    case ENTITY_TYPES.SEASONS:
    case ENTITY_TYPES.TEAM_LOGOS:
      // allow custom keys if you ever want to segment, otherwise default "all"
      return keyFromParts(entityType, params);

    // Standings are per tournament+season
    case ENTITY_TYPES.STANDINGS:
      // expected: { tournament_id, season_id }
      return keyFromParts(entityType, params);

    // Player stats can be:
    // - per player only (if your fetch endpoint is "player stats for current season")
    // - or per player+tournament+season(+team)
    // Use whatever identifiers you have available during refresh.
    case ENTITY_TYPES.PLAYER_STATS:
      // expected: { player_id, tournament_id?, season_id?, team_id? }
      return keyFromParts(entityType, params);

    // Team stats similar
    case ENTITY_TYPES.TEAM_STATS:
      // expected: { team_id, tournament_id?, season_id? }
      return keyFromParts(entityType, params);

    default:
      throw new Error(`Unknown entityType: ${entityType}`);
  }
}

// ---- DB operations ----

export async function markFresh({ entityType, entityKey }) {
  const now = new Date().toISOString();

  const { error } = await supabase.from("entity_freshness").upsert(
    {
      entity_type: entityType,
      entity_key: entityKey,
      last_fetched_at: now,
      status: "success",
      error: null,
      updated_at: now,
    },
    { onConflict: "entity_type,entity_key" },
  );

  if (error) throw error;
}

export async function markFailed({ entityType, entityKey, err }) {
  const now = new Date().toISOString();
  const msg = String(err?.message ?? err);

  const { error } = await supabase.from("entity_freshness").upsert(
    {
      entity_type: entityType,
      entity_key: entityKey,
      status: "failed",
      error: msg,
      updated_at: now,
    },
    { onConflict: "entity_type,entity_key" },
  );

  if (error) throw error;
}

export async function markFreshMany(items) {
  if (!items?.length) return;

  const now = new Date().toISOString();
  const payload = items.map(({ entityType, entityKey }) => ({
    entity_type: entityType,
    entity_key: entityKey,
    last_fetched_at: now,
    status: "success",
    error: null,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("entity_freshness")
    .upsert(payload, { onConflict: "entity_type,entity_key" });

  if (error) throw error;
}

export async function getFreshness({ entityType, entityKey }) {
  const { data, error } = await supabase
    .from("entity_freshness")
    .select("last_fetched_at,status,error,updated_at")
    .eq("entity_type", entityType)
    .eq("entity_key", entityKey)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}
