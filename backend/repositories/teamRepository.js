import { supabase } from "../lib/supabaseClient.js";

const TEAM_SELECT = "id, api_id, name, city, stadium, logo_url";

function getTeamsBaseQuery() {
  return supabase.from("teams").select(TEAM_SELECT);
}

export async function listTeams() {
  const query = getTeamsBaseQuery();
  const { data, error } = await query.order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getTeamById(id) {
  const query = getTeamsBaseQuery();
  const { data, error } = await query.eq("id", id).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listTeamMappings() {
  const { data, error } = await supabase
    .from("teams")
    .select("id, api_id, name")
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getLatestTeamStatsByApiId(apiId) {
  const { data, error } = await supabase
    .from("team_stats")
    .select("*")
    .eq("team_id", apiId)
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}
