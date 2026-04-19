const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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

export const getStandings = async (tournamentId: number, seasonId: number) => {
  const params = new URLSearchParams({
    tournamentId: String(tournamentId),
    seasonId: String(seasonId),
  });

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

// ==========================================
// 4. ΠΡΟΦΙΛ ΠΑΙΚΤΗ (PlayerProfile)
// ==========================================
export const getPlayer = async (id: string | number) => {
  return request(`/api/players/${id}`);
};
