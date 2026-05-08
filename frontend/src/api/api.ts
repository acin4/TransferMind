import type { TeamSeasonStatEntry } from "../utils/teamsComparison";
import type { TeamStatKey, TeamStats } from "../teamStatsConfig";

// The frontend reads the backend base URL from Vite environment variables.
// Removing one trailing slash keeps later URLs predictable, so "/api/teams"
// does not accidentally become "//api/teams" when both pieces are joined.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

// A small TypeScript model for one team row in list-style UI screens.
// Optional fields use "?" because some backend responses may not include every
// visual detail, and React components can decide how to display missing data.
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

// Stats shown next to players in list views. The index signature allows the UI
// to receive extra stat keys from the API without breaking TypeScript.
export type PlayerListStat = {
  goals?: number | null;
  assists?: number | null;
  [key: string]: unknown;
};

export type PlayerRelatedTeam = {
  id: number | string;
  name: string;
  logo_url?: string | null;
};

// A player item as the frontend expects to receive it from backend endpoints.
// Some fields have two naming styles, such as team_logo and teamLogo, so older
// and newer UI code can both read the same kind of data safely.
export type PlayerListItem = {
  id: number | string;
  name: string;
  team_id?: number | string | null;
  team_name?: string | null;
  team_logo?: string | null;
  teamLogo?: string | null;
  tournament_name?: string | null;
  tournamentName?: string | null;
  position?: string | null;
  height?: number | string | null;
  player_stats?: PlayerListStat[] | null;
  commonStats?: PlayerListStat;
  outfieldStats?: PlayerListStat | null;
  goalkeeperStats?: PlayerListStat | null;
  related_teams?: PlayerRelatedTeam[] | null;
  [key: string]: unknown;
};

// A grouped squad response: one team plus all players that belong to that team.
// This is useful for UI sections that render teams as headings and players below.
export type PlayerTeamSquad = {
  teamId: number | string;
  teamName: string;
  teamLogo?: string | null;
  tournamentId?: number | string | null;
  tournamentName?: string | null;
  seasonId?: number | string | null;
  seasonName?: string | null;
  players: PlayerListItem[];
};

export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PlayerListOptions = {
  page: number;
  limit: number;
  search?: string;
  teamId?: number | string;
  position?: string;
};

export type TeamListOptions = {
  page: number;
  limit: number;
  search?: string;
  country?: string;
};

// Team profile data starts with the normal team list fields and adds the
// tournament context needed by the team profile screen.
export type TeamProfileData = TeamListItem & {
  tournament_id?: number | null;
  tournament_name?: string | null;
};

// One season option shown in a team profile. The UI can use these rows to build
// a season selector and to know which season is marked as current.
export type TeamProfileSeason = {
  season_id: number;
  season_api_id?: number | null;
  season_name?: string | null;
  tournament_id?: number | null;
  tournament_api_id?: number | null;
  tournament_name?: string | null;
  is_current: boolean;
};

// A player row inside a team profile squad section. The UI only needs display
// details here, not the full backend/player database record.
export type TeamProfilePlayer = {
  id: number | string;
  name: string;
  photo_url?: string | null;
  country?: { name?: string | null } | null;
  nationality?: string | null;
  position?: string | null;
  height?: number | string | null;
  date_of_birth?: string | null;
  [key: string]: unknown;
};

// A single standings table row. Most fields are optional because different
// competitions can expose slightly different standings data.
export type TeamStandingRow = {
  id?: number | string | null;
  team_id: number | string | null;
  team_name?: string | null;
  team_logo?: string | null;
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

// A standings group represents one table the UI can render, for example a league
// table or a specific stage/group in a tournament.
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

// The standings page receives all possible groups plus the key that should be
// selected first in the UI.
export type StandingsPayload = {
  groups: StandingsGroup[];
  selectedGroupKey: string | null;
};

// Optional filters for the standings endpoint. Components pass these when the
// user chooses a specific group or stage from the UI.
export type StandingsOptions = {
  standingGroupId?: number | null;
  stageTournamentId?: number | null;
};

// A standings group as returned inside the richer team profile response.
// It is separate from StandingsGroup because profile pages use a slightly
// different backend shape.
export type TeamProfileStandingsGroup = {
  key?: string;
  standingGroupId: number | string | null;
  stageTournamentId: number | string | null;
  stage_name?: string | null;
  group_name?: string | null;
  stage_label?: string | null;
  rows: TeamStandingRow[];
};

// The full data package needed to render the Team Profile screen in one request.
// Fetching this together helps the UI avoid many separate loading states.
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

// The initial Teams Comparison dataset contains selectable team-season entries
// and optional stat metadata for building comparison controls.
export type TeamsComparisonDataset = {
  entries: TeamSeasonStatEntry[];
  stats?: TeamComparisonStat[];
};

// One stat value for one compared team. The UI can show raw numbers while also
// using normalized/adjusted scores for fair chart comparisons.
export type TeamComparisonValue = {
  rawValue: number | null;
  normalizedValue: number | null;
  adjustedScore: number | null;
};

// Metadata that tells the comparison UI how to label and interpret a stat.
// The direction tells charts whether a higher raw number is better or worse.
export type TeamComparisonStat = {
  key: TeamStatKey;
  label: string;
  category: string | null;
  unit: string | null;
  direction: "positive" | "negative";
  minRawValue?: number | null;
  maxRawValue?: number | null;
};

// One team row in the comparison matrix. Each stat key points to its calculated
// comparison value for that team.
export type TeamComparisonEntry = {
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  values: Partial<Record<TeamStatKey, TeamComparisonValue>>;
};

// Response used by the comparison chart/table UI after the user chooses teams
// and stats to compare.
export type TeamComparisonPayload = {
  context: {
    tournamentId: number;
    seasonId: number;
  };
  stats: TeamComparisonStat[];
  entries: TeamComparisonEntry[];
};

// Request body sent when the UI asks the backend to build a comparison matrix.
// Keeping this typed prevents components from sending missing or misspelled keys.
export type TeamComparisonMatrixRequest = {
  tournamentId: number;
  seasonId: number;
  teamIds: number[];
  statKeys: TeamStatKey[];
};

// One selected team-season entry for clustering. The IDs describe exactly which
// team, tournament, and season should be included in the analysis.
export type TeamClusterEntryRequest = {
  teamId: number;
  tournamentId: number;
  seasonId: number;
};

// Shared request shape for cluster-related actions. The user chooses entries and
// stats in the UI, then the backend calculates clustering data from them.
export type TeamClusterRequest = {
  teamSeasonEntries: TeamClusterEntryRequest[];
  statKeys: TeamStatKey[];
};

// Elbow analysis tries several k values, so maxK limits how many cluster counts
// the backend should test.
export type TeamClusterElbowRequest = TeamClusterRequest & {
  maxK?: number;
};

// Running clusters needs one exact k value chosen by the user or suggested by
// the elbow result.
export type TeamClusterRunRequest = TeamClusterRequest & {
  k: number;
};

// Metadata for one stat used in clustering. The min/max values let the UI explain
// or visualize how raw stats were normalized.
export type TeamClusterStat = {
  key: TeamStatKey;
  label: string;
  category: string | null;
  direction: "positive" | "negative";
  min: number;
  max: number;
  isConstant: boolean;
};

// One row in the clustering matrix. It includes display labels plus raw and
// normalized stats, so the UI can show both human-friendly values and model input.
export type TeamClusterMatrixRow = {
  entryId: string;
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  tournamentId: number;
  tournamentName: string | null;
  seasonId: number;
  seasonName: string | null;
  rawStats: Partial<Record<TeamStatKey, number>>;
  normalizedStats: Partial<Record<TeamStatKey, number>>;
};

// One point in an elbow chart. The UI plots k against inertia to help the user
// choose a reasonable number of clusters.
export type TeamClusterElbowPoint = {
  k: number;
  inertia: number;
  iterations: number;
};

// Full response for elbow analysis, including chart points, matrix rows, and
// warnings that the UI can show to guide the user.
export type TeamClusterElbowPayload = {
  context: {
    selectedEntryCount: number;
  };
  rows: TeamClusterMatrixRow[];
  stats: TeamClusterStat[];
  elbow: TeamClusterElbowPoint[];
  suggestedK: number | null;
  maxK: number;
  warnings: string[];
};

// A clustered team-season row. It reuses the matrix row fields and adds the
// assigned cluster plus distance from the cluster center.
export type TeamClusterAssignment = TeamClusterMatrixRow & {
  clusterId: number;
  distanceToCentroid: number;
};

// The center point for one cluster. Charts can use centroids to describe the
// typical stat profile of that cluster.
export type TeamClusterCentroid = {
  clusterId: number;
  values: Partial<Record<TeamStatKey, number>>;
};

// Full response after actually running k-means clustering for the selected k.
// This powers the cluster result tables and visualizations.
export type TeamClusterRunPayload = {
  context: {
    selectedEntryCount: number;
  };
  k: number;
  iterations: number;
  inertia: number;
  stats: TeamClusterStat[];
  assignments: TeamClusterAssignment[];
  centroids: TeamClusterCentroid[];
  warnings: string[];
};

// A compact team search result for global search/autocomplete UI.
export type SearchTeamResult = {
  id: number;
  name: string;
  logo: string | null;
  country: string | null;
  city: string | null;
  stadium: string | null;
  tournamentName?: string | null;
  seasonName?: string | null;
};

// A compact player search result for global search/autocomplete UI.
export type SearchPlayerResult = {
  id: number;
  name: string;
  photo: string | null;
  position: string | null;
  height: number | string | null;
  nationality: string | null;
  teamId: number | null;
  teamName: string | null;
};

// Search returns separate arrays so the UI can render team and player result
// groups with different icons, labels, or navigation targets.
export type SearchPayload = {
  teams: SearchTeamResult[];
  players: SearchPlayerResult[];
};

// Shared helper used by every API function below.
// It keeps fetch, JSON parsing, error handling, and the backend response envelope
// in one place, so page components only work with the useful "data" value.
async function request(path: string, options?: RequestInit) {
  // Build the final URL from the optional environment base URL and endpoint path.
  // Passing options lets POST endpoints provide method, headers, and a JSON body.
  const response = await fetch(`${apiBaseUrl}${path}`, options);

  // Some failed responses may not contain JSON, so catch parsing errors and use
  // null instead of crashing before we can check response.ok.
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    // The backend usually sends { error: "message" }. Throwing here lets React
    // pages handle errors with normal try/catch or data-loading error states.
    throw new Error(payload?.error || "Request failed.");
  }

  // Backend success responses are wrapped as { data: ... }. Returning only data
  // keeps UI code focused on rendering instead of unpacking response envelopes.
  return payload?.data;
}

async function requestEnvelope<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload;
}

// ==========================================
// 1. HOME & GENERAL LISTS (Teams / Players)
// ==========================================
// Fetches all teams for list pages, selectors, or home-screen summaries.
export const getTeams = async (): Promise<TeamListItem[]> => {
  return request("/api/teams");
};

export const getPlayerTeams = async (
  options: TeamListOptions,
): Promise<PaginatedResponse<TeamListItem>> => {
  const params = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
  });

  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }

  if (options.country?.trim() && options.country !== "ALL") {
    params.set("country", options.country.trim());
  }

  return requestEnvelope<PaginatedResponse<TeamListItem>>(
    `/api/teams?${params.toString()}`,
  );
};

// Fetches players, optionally filtered by team. The optional teamId supports UI
// flows where a user picks a team first and then sees only that team's players.
export const getPlayers = async (
  options: PlayerListOptions,
): Promise<PaginatedResponse<PlayerListItem>> => {
  // URLSearchParams safely builds query strings and handles encoding for us.
  const params = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
  });

  if (options.teamId !== undefined && options.teamId !== "") {
    // Convert to string because query-string values are always text in URLs.
    params.set("teamId", String(options.teamId));
  }

  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }

  if (options.position?.trim()) {
    params.set("position", options.position.trim());
  }

  return requestEnvelope<PaginatedResponse<PlayerListItem>>(
    `/api/players?${params.toString()}`,
  );
};

export const getTeamPlayers = async (
  teamId: number | string,
  options: Omit<PlayerListOptions, "teamId" | "position">,
): Promise<PaginatedResponse<PlayerListItem>> => {
  const params = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
  });

  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }

  return requestEnvelope<PaginatedResponse<PlayerListItem>>(
    `/api/teams/${teamId}/players?${params.toString()}`,
  );
};

// Fetches players already grouped by team, which is convenient for squad-style
// UI sections that should not group the data again on the client.
export const getPlayerTeamSquads = async (): Promise<PlayerTeamSquad[]> => {
  return request("/api/players/team-squads");
};

// Fetches teams and players matching the user's search text. This is typically
// called after a search input changes or when the user submits a search.
export const getSearchResults = async (
  query: string,
): Promise<SearchPayload> => {
  // URLSearchParams encodes spaces and special characters in the search text.
  const params = new URLSearchParams({ q: query });
  return request(`/api/search?${params.toString()}`);
};

// ==========================================
// 2. STANDINGS
// ==========================================
// Fetches tournaments with their current seasons for standings filters.
export const getCurrentTournaments = async () => {
  return request("/api/tournaments/current-seasons");
};

// Fetches season options for a chosen tournament, usually after the user selects
// a tournament in a dropdown.
export const getTournamentSeasons = async (tournamentId: number) => {
  return request(`/api/tournaments/${tournamentId}/seasons`);
};

// Fetches standings for one tournament and season. Optional group/stage filters
// let the UI switch between multiple tables without needing a different helper.
export const getStandings = async (
  tournamentId: number,
  seasonId: number,
  options: StandingsOptions = {},
): Promise<StandingsPayload> => {
  // Required IDs are always sent, because standings need both competition and
  // season context to return the correct table.
  const params = new URLSearchParams({
    tournamentId: String(tournamentId),
    seasonId: String(seasonId),
  });

  if (options.standingGroupId != null) {
    // Add this only when the user or page has selected a specific standings group.
    params.set("standingGroupId", String(options.standingGroupId));
  }

  if (options.stageTournamentId != null) {
    // Add this only when a tournament has stages that need separate filtering.
    params.set("stageTournamentId", String(options.stageTournamentId));
  }

  return request(`/api/standings?${params.toString()}`);
};

// ==========================================
// 3. TEAM PROFILE
// ==========================================
// Fetches basic details for one team profile page.
export const getTeam = async (id: string | number) => {
  return request(`/api/teams/${id}`);
};

// Fetches all seasons available for one team, usually to populate a season picker.
export const getTeamSeasons = async (teamId: number | string) => {
  return request(`/api/teams/${teamId}/seasons`);
};

// Fetches the complete Team Profile screen data. Passing seasonId lets the user
// switch seasons while keeping the same team profile route/page.
export const getTeamProfile = async (
  teamId: number | string,
  seasonId?: number | string,
): Promise<TeamProfilePayload> => {
  const params = new URLSearchParams();

  if (seasonId !== undefined) {
    // The backend chooses a default season when this is omitted.
    params.set("seasonId", String(seasonId));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/teams/${teamId}/profile${suffix}`);
};

// Fetches only the statistical summary for one team and optional season.
// This is useful when a page needs stats without the whole profile payload.
export const getTeamStats = async (
  teamId: number | string,
  seasonId?: number,
) => {
  const params = new URLSearchParams();

  if (seasonId !== undefined) {
    // Optional season filtering lets the same helper support current and past stats.
    params.set("seasonId", String(seasonId));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/teams/${teamId}/stats${suffix}`);
};

// Fetches the selectable dataset for Teams Comparison. The UI uses this to build
// team-season selectors before the user runs a focused comparison.
export const getTeamsComparisonDataset =
  async (): Promise<TeamsComparisonDataset> => {
    return request("/api/teams/comparison-dataset");
  };

// Sends the user's chosen teams and stat keys to the backend so it can calculate
// comparable raw and normalized values for charts and tables.
export const getTeamComparisonMatrix = async (
  payload: TeamComparisonMatrixRequest,
): Promise<TeamComparisonPayload> => {
  return request("/api/teams/comparison-dataset", {
    // POST is used because the selection can contain arrays, which are clearer
    // and safer to send as a JSON body than as a long query string.
    method: "POST",
    headers: {
      // This tells Express to parse the request body as JSON.
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
};

// Runs elbow analysis for the selected team-season entries and stats.
// The Cluster Analysis UI uses the result to suggest a good k value.
export const calculateTeamClusterElbow = async (
  payload: TeamClusterElbowRequest,
): Promise<TeamClusterElbowPayload> => {
  return request("/api/teams/clustering/elbow", {
    // POST is appropriate here because the request contains a structured analysis
    // setup, not just a simple resource ID.
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
};

// Runs the final clustering calculation after the UI has a chosen k value.
// The returned assignments drive the cluster result cards, tables, or charts.
export const runTeamClusters = async (
  payload: TeamClusterRunRequest,
): Promise<TeamClusterRunPayload> => {
  return request("/api/teams/clustering/run", {
    // The backend needs the full selected dataset and k value, so the frontend
    // sends them as JSON in the request body.
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
};

// ==========================================
// 4. PLAYER PROFILE
// ==========================================
// Fetches one player for the Player Profile screen. The returned type matches the
// list item shape because the profile currently reuses those display fields.
export const getPlayer = async (
  id: string | number,
): Promise<PlayerListItem> => {
  return request(`/api/players/${id}`);
};
