import { supabase } from "../supabaseClient";

// ==========================================
// 1. HOME & ΓΕΝΙΚΕΣ ΛΙΣΤΕΣ (Teams / Players)
// ==========================================
export const getTeams = async () => {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true });
  return error ? [] : data || [];
};

export const getPlayers = async () => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name", { ascending: true });
  return error ? [] : data || [];
};

// ==========================================
// 2. ΒΑΘΜΟΛΟΓΙΕΣ (Standings)
// ==========================================
export const getCurrentTournaments = async () => {
  const { data, error } = await supabase
    .from("current_tournament_seasons")
    .select("*")
    .order("season_name", { ascending: true });
  return error ? [] : data || [];
};

export const getStandings = async (tournamentId: number, seasonId: number) => {
  // 1. Φέρνουμε τους βαθμούς ταξινομημένους με βάση τους ΠΟΝΤΟΥΣ (points) φθίνουσα
  const { data: standingsData, error: standingsError } = await supabase
    .from("standings")
    .select("*") 
    .eq("tournament_id", tournamentId)
    .eq("season_id", seasonId)
    .order("points", { ascending: false }); // 🟢 ΔΙΟΡΘΩΣΗ: Ταξινόμηση με βάση τους βαθμούς!

  if (standingsError || !standingsData) return [];

  // 2. Φέρνουμε ΟΛΕΣ τις ομάδες χωρίς φίλτρο για να μη χάσουμε καμία
  const { data: teamsData } = await supabase
    .from("current_season_teams")
    .select("*");

  // 3. Παντρεύουμε τα δεδομένα & Φτιάχνουμε εμείς τη "Θέση" (index)
  const finalStandings = standingsData.map((row, index) => {
    const teamMatch = teamsData?.find(
      (t) => Number(t.team_api_id) === Number(row.team_id) || Number(t.team_id) === Number(row.team_id)
    );
    
    return {
      ...row,
      position: index + 1, // 🟢 ΔΙΟΡΘΩΣΗ: Η θέση υπολογίζεται αυτόματα!
      team_name: teamMatch?.team_name || "Unknown Team"
    };
  });

  return finalStandings;
};

// ==========================================
// 3. ΠΡΟΦΙΛ ΟΜΑΔΑΣ (TeamProfile)
// ==========================================
export const getTeam = async (id: string | number) => {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();
  return error ? null : data;
};

export const getTeamStats = async (apiId: number) => {
  const { data, error } = await supabase
    .from("team_stats")
    .select("*")
    .eq("team_id", apiId)
    // 🔴 ΑΛΛΑΓΗ: Βγάζουμε το .single() και βάζουμε .limit(1) για να μην κρασάρει ποτέ!
    .limit(1); 

  if (error) {
    console.error("Σφάλμα κατά τη λήψη στατιστικών:", error);
    return null;
  }
  
  // Αν βρει δεδομένα, επιστρέφει το πρώτο αντικείμενο (την πρώτη γραμμή)
  return data && data.length > 0 ? data[0] : null;
};

// ==========================================
// 4. ΠΡΟΦΙΛ ΠΑΙΚΤΗ (PlayerProfile)
// ==========================================
export const getPlayer = async (id: string | number) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();
  return error ? null : data;
};