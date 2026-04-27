import type { TeamSeasonStatEntry } from "../utils/teamsComparison";
import type { TeamStats } from "../teamStatsConfig";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export type TeamListItem = {
  id: number;
  name: string;
  logo_url?: string | null;
  country?: string | null;
  city?: string | null;
  stadium?: string | null;
  venue?:
    | string
    | {
        name?: string | null;
        city?: string | null;
      }
    | null;
  badge_label?: string | null;
  badge_is_current?: boolean;
};

export type TeamProfileData = TeamListItem & {
  tournament_id?: number | null;
  tournament_name?: string | null;
};

export type TeamProfileSeason = {
  season_id: number;
  season_api_id?: number | null;
  season_name?: string | null;
  tournament_id?: number | null;
  tournament_name?: string | null;
  is_current: boolean;
};

export type TeamProfilePlayer = {
  id: number | string;
  name: string;
  photo_url?: string | null;
  country?: { name?: string | null } | null;
  nationality?: string | null;
  position?: string | null;
  date_of_birth?: string | null;
  [key: string]: unknown;
};

export type TeamStandingRow = {
  id?: number | string | null;
  team_id: number | string | null;
  team_name?: string | null;
  position?: number | null;
  matches?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
  goals_for?: number | null;
  goals_against?: number | null;
  goal_diff?: number | null;
  points?: number | null;
  standing_group_id?: number | string | null;
  standing_group_name?: string | null;
  stage_tournament_id?: number | string | null;
  stage_tournament_name?: string | null;
  stage_label?: string | null;
  [key: string]: unknown;
};

export type StandingsGroup = {
  key: string;
  label: string;
  stage: string | null;
  priority: number;
  rows: TeamStandingRow[];
};

export type StandingsPayload = {
  groups: StandingsGroup[];
  selectedGroupKey: string | null;
};

export type StandingsOptions = {
  standingGroupId?: number | null;
  stageTournamentId?: number | null;
};

export type TeamProfileStandingsGroup = {
  key?: string;
  standingGroupId: number | string | null;
  stageTournamentId: number | string | null;
  stage_name?: string | null;
  group_name?: string | null;
  stage_label?: string | null;
  rows: TeamStandingRow[];
};

export type TeamProfilePayload = {
  team: TeamProfileData;
  squad: TeamProfilePlayer[];
  seasons: TeamProfileSeason[];
  selectedSeason: TeamProfileSeason | null;
  stats: TeamStats | null;
  standings: {
    groups: TeamProfileStandingsGroup[];
    rows: TeamStandingRow[];
  };
  selectedStandingsGroup: TeamProfileStandingsGroup | null;
  miniTable: {
    rows: TeamStandingRow[];
    teamRow: TeamStandingRow | null;
  };
};

export type TeamsComparisonDataset = {
  entries: TeamSeasonStatEntry[];
};

async function request(path: string) {
  const response = await fetch(`${apiBaseUrl}${path}`);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload?.data;
}

// ==========================================
// 1. HOME & ΓΕΝΙΚΕΣ ΛΙΣΤΕΣ (Teams / Players)
// ==========================================
export const getTeams = async () => {
  return request("/api/teams");
};

export const getPlayers = async (teamId?: number | string) => {
  const params = new URLSearchParams();

  if (teamId !== undefined) {
    params.set("teamId", String(teamId));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/players${suffix}`);
};

// ==========================================
// 2. ΒΑΘΜΟΛΟΓΙΕΣ (Standings)
// ==========================================
export const getCurrentTournaments = async () => {
  return request("/api/tournaments/current-seasons");
};

export const getTournamentSeasons = async (tournamentId: number) => {
  return request(`/api/tournaments/${tournamentId}/seasons`);
};

export const getStandings = async (
  tournamentId: number,
  seasonId: number,
  options: StandingsOptions = {},
): Promise<StandingsPayload> => {
  const params = new URLSearchParams({
    tournamentId: String(tournamentId),
    seasonId: String(seasonId),
  });

  if (options.standingGroupId != null) {
    params.set("standingGroupId", String(options.standingGroupId));
  }

  if (options.stageTournamentId != null) {
    params.set("stageTournamentId", String(options.stageTournamentId));
  }

  return request(`/api/standings?${params.toString()}`);
};

// ==========================================
// 3. ΠΡΟΦΙΛ ΟΜΑΔΑΣ (TeamProfile)
// ==========================================
export const getTeam = async (id: string | number) => {
  return request(`/api/teams/${id}`);
};

export const getTeamSeasons = async (teamId: number | string) => {
  return request(`/api/teams/${teamId}/seasons`);
};

export const getTeamProfile = async (
  teamId: number | string,
  seasonId?: number | string,
): Promise<TeamProfilePayload> => {
  const params = new URLSearchParams();

  if (seasonId !== undefined) {
    params.set("seasonId", String(seasonId));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/teams/${teamId}/profile${suffix}`);
};

export const getTeamStats = async (
  teamId: number | string,
  seasonId?: number,
) => {
  const params = new URLSearchParams();

  if (seasonId !== undefined) {
    params.set("seasonId", String(seasonId));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/teams/${teamId}/stats${suffix}`);
};

export const getTeamsComparisonDataset =
  async (): Promise<TeamsComparisonDataset> => {
    return request("/api/teams/comparison-dataset");
  };

// ==========================================
// 4. ΠΡΟΦΙΛ ΠΑΙΚΤΗ (PlayerProfile)
// ==========================================
export const getPlayer = async (id: string | number) => {
  return request(`/api/players/${id}`);
};
