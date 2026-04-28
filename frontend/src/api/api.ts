import type { TeamSeasonStatEntry } from "../utils/teamsComparison";
import type { TeamStatKey, TeamStats } from "../teamStatsConfig";

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

export type PlayerListStat = {
  goals?: number | null;
  assists?: number | null;
  [key: string]: unknown;
};

export type PlayerListItem = {
  id: number | string;
  name: string;
  team_id?: number | string | null;
  height?: number | string | null;
  player_stats?: PlayerListStat[] | null;
  [key: string]: unknown;
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
  standingGroupId: number | null;
  stageTournamentId: number | null;
  tournamentId: number;
  seasonId: number;
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
  stats?: TeamComparisonStat[];
};

export type TeamComparisonValue = {
  rawValue: number | null;
  normalizedValue: number | null;
  adjustedScore: number | null;
};

export type TeamComparisonStat = {
  key: TeamStatKey;
  label: string;
  category: string | null;
  unit: string | null;
  direction: "positive" | "negative";
  minRawValue?: number | null;
  maxRawValue?: number | null;
};

export type TeamComparisonEntry = {
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  values: Partial<Record<TeamStatKey, TeamComparisonValue>>;
};

export type TeamComparisonPayload = {
  context: {
    tournamentId: number;
    seasonId: number;
  };
  stats: TeamComparisonStat[];
  entries: TeamComparisonEntry[];
};

export type TeamComparisonMatrixRequest = {
  tournamentId: number;
  seasonId: number;
  teamIds: number[];
  statKeys: TeamStatKey[];
};

export type TeamClusterRequest = {
  tournamentId: number;
  seasonId: number;
  teamIds: number[];
  statKeys: TeamStatKey[];
};

export type TeamClusterElbowRequest = TeamClusterRequest & {
  maxK?: number;
};

export type TeamClusterRunRequest = TeamClusterRequest & {
  k: number;
};

export type TeamClusterStat = {
  key: TeamStatKey;
  label: string;
  category: string | null;
  direction: "positive" | "negative";
  min: number;
  max: number;
  isConstant: boolean;
};

export type TeamClusterMatrixRow = {
  teamId: number;
  teamName: string;
  rawStats: Partial<Record<TeamStatKey, number | null>>;
  normalizedStats: Partial<Record<TeamStatKey, number>>;
};

export type TeamClusterElbowPoint = {
  k: number;
  inertia: number;
  iterations: number;
};

export type TeamClusterElbowPayload = {
  context: {
    tournamentId: number;
    seasonId: number;
  };
  rows: TeamClusterMatrixRow[];
  stats: TeamClusterStat[];
  elbow: TeamClusterElbowPoint[];
  suggestedK: number | null;
  maxK: number;
  warnings: string[];
};

export type TeamClusterAssignment = TeamClusterMatrixRow & {
  clusterId: number;
  distanceToCentroid: number;
};

export type TeamClusterCentroid = {
  clusterId: number;
  values: Partial<Record<TeamStatKey, number>>;
};

export type TeamClusterRunPayload = {
  context: {
    tournamentId: number;
    seasonId: number;
  };
  k: number;
  iterations: number;
  inertia: number;
  stats: TeamClusterStat[];
  assignments: TeamClusterAssignment[];
  centroids: TeamClusterCentroid[];
  warnings: string[];
};

export type SearchTeamResult = {
  id: number;
  name: string;
  logo: string | null;
  country: string | null;
  city: string | null;
  stadium: string | null;
};

export type SearchPlayerResult = {
  id: number;
  name: string;
  photo: string | null;
  position: string | null;
  nationality: string | null;
  teamId: number | null;
  teamName: string | null;
};

export type SearchPayload = {
  teams: SearchTeamResult[];
  players: SearchPlayerResult[];
};

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload?.data;
}

// ==========================================
// 1. HOME & ΓΕΝΙΚΕΣ ΛΙΣΤΕΣ (Teams / Players)
// ==========================================
export const getTeams = async (): Promise<TeamListItem[]> => {
  return request("/api/teams");
};

export const getPlayers = async (
  teamId?: number | string,
): Promise<PlayerListItem[]> => {
  const params = new URLSearchParams();

  if (teamId !== undefined) {
    params.set("teamId", String(teamId));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/players${suffix}`);
};

export const getSearchResults = async (
  query: string,
): Promise<SearchPayload> => {
  const params = new URLSearchParams({ q: query });
  return request(`/api/search?${params.toString()}`);
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

export const getTeamComparisonMatrix = async (
  payload: TeamComparisonMatrixRequest,
): Promise<TeamComparisonPayload> => {
  return request("/api/teams/comparison-dataset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
};

export const calculateTeamClusterElbow = async (
  payload: TeamClusterElbowRequest,
): Promise<TeamClusterElbowPayload> => {
  return request("/api/teams/clustering/elbow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
};

export const runTeamClusters = async (
  payload: TeamClusterRunRequest,
): Promise<TeamClusterRunPayload> => {
  return request("/api/teams/clustering/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
};

// ==========================================
// 4. ΠΡΟΦΙΛ ΠΑΙΚΤΗ (PlayerProfile)
// ==========================================
export const getPlayer = async (id: string | number) => {
  return request(`/api/players/${id}`);
};
