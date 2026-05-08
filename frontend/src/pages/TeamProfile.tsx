import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useParams } from "react-router-dom";
import {
  getTeamsComparisonDataset,
  getTeamProfile,
  type TeamProfileData,
  type TeamProfilePayload,
  type TeamProfilePlayer,
  type TeamProfileSeason,
  type TeamProfileStandingsGroup,
  type TeamStandingRow,
} from "../api/api";
import {
  TEAM_STATS_CATEGORIES,
  type TeamStats,
  type TeamStatsCategoryId,
} from "../teamStatsConfig";
import TeamHeader from "../components/team-profile/TeamHeader";
import TeamProfileControls from "../components/team-profile/TeamProfileControls";
import TeamStandingsPreview from "../components/team-profile/TeamStandingsPreview";
import TeamStatsPanel from "../components/team-profile/TeamStatsPanel";
import TeamSquadTable from "../components/team-profile/TeamSquadTable";
import type { TeamProfileTabId } from "../components/team-profile/types";
import type { TeamSeasonStatEntry } from "../utils/teamsComparison";
import { getTeamsBySeasonTournament } from "../utils/teamStatsPerformance";
import ProfileLayout from "../components/profile/ProfileLayout";

// TeamProfile is a route page. It reads a team id from the URL, loads profile
// data from the backend, and lets the user switch between statistics, standings,
// and squad views.
export default function TeamProfile() {
  // id comes from the route, for example /team/123.
  const { id } = useParams();

  // Core team profile data shown in the header and panels.
  const [team, setTeam] = useState<TeamProfileData | null>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [teamSquad, setTeamSquad] = useState<TeamProfilePlayer[]>([]);
  // comparisonEntries is a larger dataset used for relative team-stat comparisons.
  const [comparisonEntries, setComparisonEntries] = useState<
    TeamSeasonStatEntry[]
  >([]);
  // Season selector data and selected season state.
  const [availableSeasons, setAvailableSeasons] = useState<
    TeamProfileSeason[]
  >([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  // loadedSeasonId remembers which season's profile data is currently loaded.
  const [loadedSeasonId, setLoadedSeasonId] = useState<number | null>(null);

  // Standings preview data for the selected season/group.
  const [teamStanding, setTeamStanding] = useState<TeamStandingRow | null>(
    null,
  );
  const [miniStandings, setMiniStandings] = useState<TeamStandingRow[]>([]);
  const [selectedStandingsGroup, setSelectedStandingsGroup] =
    useState<TeamProfileStandingsGroup | null>(null);

  // Loading and error states are split between the initial page load, season
  // changes, and the separate comparison dataset request.
  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [comparisonDatasetLoading, setComparisonDatasetLoading] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  // activeTab controls which main profile panel is visible.
  const [activeTab, setActiveTab] =
    useState<TeamProfileTabId>("statistics");
  // activeStatsCategory controls the selected category inside TeamStatsPanel.
  const [activeStatsCategory, setActiveStatsCategory] =
    useState<TeamStatsCategoryId>(TEAM_STATS_CATEGORIES[0].id);

  // Applies one TeamProfile API response to all local state slices.
  // This avoids duplicating the same state updates for initial and season loads.
  const applyProfileData = useCallback((profile: TeamProfilePayload) => {
    setTeam(profile.team);
    setStats(profile.stats || null);
    setTeamSquad(profile.squad || []);
    setAvailableSeasons(profile.seasons || []);
    setTeamStanding(profile.miniTable?.teamRow ?? null);
    setMiniStandings(profile.miniTable?.rows ?? []);
    setSelectedStandingsGroup(profile.selectedStandingsGroup ?? null);
  }, []);

  // Load the comparison dataset once. It powers relative team-stat comparisons
  // in the stats panel and is separate from the selected team's profile request.
  useEffect(() => {
    let cancelled = false;

    const fetchComparisonDataset = async () => {
      try {
        setComparisonDatasetLoading(true);
        // Backend returns team-season stat entries for comparison charts.
        const dataset = await getTeamsComparisonDataset();

        if (!cancelled) {
          setComparisonEntries(dataset.entries);
        }
      } catch (err) {
        console.error("Unable to load team statistics comparison pool:", err);

        if (!cancelled) {
          setComparisonEntries([]);
        }
      } finally {
        if (!cancelled) {
          setComparisonDatasetLoading(false);
        }
      }
    };

    fetchComparisonDataset();

    return () => {
      // Prevent stale async work from updating state after this component unmounts.
      cancelled = true;
    };
  }, []);

  // Initial profile load. Runs when the route id changes.
  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        if (!id) {
          // Without a route id there is no team to fetch.
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        setSeasonError(null);
        // Clear old team data so navigation between teams does not briefly show
        // stale profile details.
        setTeam(null);
        setStats(null);
        setTeamSquad([]);
        setTeamStanding(null);
        setMiniStandings([]);
        setSelectedStandingsGroup(null);
        setAvailableSeasons([]);
        setSelectedSeasonId(null);
        setLoadedSeasonId(null);

        // Backend returns the full team profile for the default/current season.
        const profile = await getTeamProfile(id);

        if (cancelled) {
          return;
        }

        applyProfileData(profile);
        setSelectedSeasonId(profile.selectedSeason?.season_id ?? null);
        setLoadedSeasonId(profile.selectedSeason?.season_id ?? null);
        setLoading(false);
      } catch (err) {
        console.error("Σφάλμα κατά τη φόρτωση του Profile:", err);
        if (!cancelled) {
          setError("Δεν βρέθηκαν δεδομένα για αυτή την ομάδα.");
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      // Mark this profile request as stale.
      cancelled = true;
    };
  }, [applyProfileData, id]);

  // Season-specific reload. Runs after the user chooses a different season from
  // the header dropdown.
  useEffect(() => {
    let cancelled = false;

    const fetchSeasonData = async () => {
      if (
        !id ||
        !team ||
        !selectedSeasonId ||
        selectedSeasonId === loadedSeasonId
      ) {
        // Skip until the page has a team, a selected season, and a season that
        // is different from the one already loaded.
        return;
      }

      try {
        setSeasonLoading(true);
        setSeasonError(null);

        // Fetch the same team profile, but for the selected season id.
        const profile = await getTeamProfile(id, selectedSeasonId);

        if (cancelled) {
          return;
        }

        applyProfileData(profile);
        setSelectedSeasonId(profile.selectedSeason?.season_id ?? null);
        setLoadedSeasonId(profile.selectedSeason?.season_id ?? null);
      } catch (err) {
        console.error("Σφάλμα κατά τη φόρτωση δεδομένων σεζόν:", err);

        if (!cancelled) {
          setStats(null);
          setTeamStanding(null);
          setMiniStandings([]);
          setSelectedStandingsGroup(null);
          setSeasonError("Αδυναμία φόρτωσης δεδομένων για τη σεζόν.");
        }
      } finally {
        if (!cancelled) {
          setSeasonLoading(false);
          setLoading(false);
        }
      }
    };

    fetchSeasonData();

    return () => {
      // Mark this season request as stale.
      cancelled = true;
    };
  }, [applyProfileData, id, loadedSeasonId, selectedSeasonId, team]);

  // Find the full season object for the currently selected season id.
  const selectedSeason = useMemo(
    () =>
      availableSeasons.find(
        (season) => season.season_id === selectedSeasonId,
      ) ?? null,
    [availableSeasons, selectedSeasonId],
  );

  // Competition context can come from the selected season or from the team itself.
  const selectedCompetitionId =
    selectedSeason?.tournament_id ?? team?.tournament_id ?? null;
  const selectedCompetitionName =
    selectedSeason?.tournament_name ?? team?.tournament_name ?? null;
  // Filter the comparison dataset down to teams from the same season/tournament.
  // That keeps relative comparisons fair and relevant.
  const selectedStatsPool = useMemo(
    () =>
      getTeamsBySeasonTournament(
        comparisonEntries,
        selectedSeasonId,
        selectedCompetitionId,
      ),
    [comparisonEntries, selectedCompetitionId, selectedSeasonId],
  );
  // Subtitle combines competition and season when available, with simple fallbacks
  // for teams that do not have full season context.
  const headerSubtitle =
    [selectedCompetitionName, selectedSeason?.season_name]
      .filter(Boolean)
      .join(" - ") ||
    team?.city ||
    "Professional Club";

  // Label shown in the standings preview panel.
  const standingsLabel =
    [selectedCompetitionName, selectedSeason?.season_name]
      .filter(Boolean)
      .join(" - ") || "League Position";

  // Season dropdown handler. The season-loading effect does the actual fetch.
  const handleSeasonChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeasonId(Number(event.target.value));
  };

  // Build a standings URL that preserves tournament, season, and selected
  // standings group/stage so the full standings page opens in the same context.
  const fullStandingsPath = useMemo(() => {
    const params = new URLSearchParams();

    if (selectedCompetitionId) {
      // Query-string values must be strings.
      params.set("tournamentId", String(selectedCompetitionId));
    }

    if (selectedSeasonId) {
      params.set("seasonId", String(selectedSeasonId));
    }

    if (selectedStandingsGroup?.standingGroupId != null) {
      params.set(
        "standingGroupId",
        String(selectedStandingsGroup.standingGroupId),
      );
    }

    if (selectedStandingsGroup?.stageTournamentId != null) {
      params.set(
        "stageTournamentId",
        String(selectedStandingsGroup.stageTournamentId),
      );
    }

    if (selectedCompetitionName) {
      // Include the display name so Standings can show a friendly fallback option.
      params.set("tournamentName", selectedCompetitionName);
    }

    const query = params.toString();
    // If there is no context, fall back to the generic standings page.
    return query ? `/standings?${query}` : "/standings";
  }, [
    selectedSeasonId,
    selectedStandingsGroup,
    selectedCompetitionId,
    selectedCompetitionName,
  ]);

  if (loading)
    // Full-screen loading state for the initial team profile request.
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-widest">
        Loading Profile...
      </div>
    );
  if (error || !team)
    // Full-screen error state when the team cannot be loaded.
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold uppercase tracking-widest text-rose-500">
        {error || "Team not found"}
      </div>
    );

  return (
    // ProfileLayout provides the shared profile shell and back navigation.
    <ProfileLayout backTo="/teams" backLabel="Back to Teams">
      <TeamHeader
        team={team}
        headerSubtitle={headerSubtitle}
        availableSeasons={availableSeasons}
        selectedSeasonId={selectedSeasonId}
        onSeasonChange={handleSeasonChange}
      />

      <TeamProfileControls
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main tab content:
          statistics uses a dedicated stats panel, while standings and squad share
          the same card wrapper below. */}
      {activeTab === "statistics" ? (
        <TeamStatsPanel
          stats={stats}
          seasonLoading={seasonLoading}
          activeStatsCategory={activeStatsCategory}
          onStatsCategoryChange={setActiveStatsCategory}
          statsPool={selectedStatsPool}
          statsPoolLoading={comparisonDatasetLoading}
          seasonError={seasonError}
          selectedTeamId={team.id}
          selectedSeasonName={selectedSeason?.season_name ?? null}
          selectedTournamentName={selectedCompetitionName}
        />
      ) : (
        // Shared card for non-statistics tabs, matching the profile page style.
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 p-6 md:p-10 shadow-2xl backdrop-blur-sm">
          {seasonError ? (
            // Season-specific error does not break the whole page; it appears
            // above standings/squad content.
            <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-xs font-black uppercase tracking-widest text-rose-400">
              {seasonError}
            </div>
          ) : null}

          {activeTab === "standings" && (
            // Compact standings preview for this team and selected season.
            <TeamStandingsPreview
              seasonLoading={seasonLoading}
              standingsLabel={standingsLabel}
              teamId={id}
              teamStanding={teamStanding}
              miniStandings={miniStandings}
              fullStandingsPath={fullStandingsPath}
            />
          )}

          {/* Squad tab shows the selected season's squad rows. */}
          {activeTab === "squad" && (
            <TeamSquadTable squad={teamSquad} teamName={team.name} />
          )}
        </div>
      )}
    </ProfileLayout>
  );
}
