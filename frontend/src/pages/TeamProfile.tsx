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

export default function TeamProfile() {
  const { id } = useParams();

  const [team, setTeam] = useState<TeamProfileData | null>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [teamSquad, setTeamSquad] = useState<TeamProfilePlayer[]>([]);
  const [comparisonEntries, setComparisonEntries] = useState<
    TeamSeasonStatEntry[]
  >([]);
  const [availableSeasons, setAvailableSeasons] = useState<
    TeamProfileSeason[]
  >([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [loadedSeasonId, setLoadedSeasonId] = useState<number | null>(null);

  const [teamStanding, setTeamStanding] = useState<TeamStandingRow | null>(
    null,
  );
  const [miniStandings, setMiniStandings] = useState<TeamStandingRow[]>([]);
  const [selectedStandingsGroup, setSelectedStandingsGroup] =
    useState<TeamProfileStandingsGroup | null>(null);

  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [comparisonDatasetLoading, setComparisonDatasetLoading] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [activeTab, setActiveTab] =
    useState<TeamProfileTabId>("statistics");
  const [activeStatsCategory, setActiveStatsCategory] =
    useState<TeamStatsCategoryId>(TEAM_STATS_CATEGORIES[0].id);

  const applyProfileData = useCallback((profile: TeamProfilePayload) => {
    setTeam(profile.team);
    setStats(profile.stats || null);
    setTeamSquad(profile.squad || []);
    setAvailableSeasons(profile.seasons || []);
    setTeamStanding(profile.miniTable?.teamRow ?? null);
    setMiniStandings(profile.miniTable?.rows ?? []);
    setSelectedStandingsGroup(profile.selectedStandingsGroup ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchComparisonDataset = async () => {
      try {
        setComparisonDatasetLoading(true);
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
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        if (!id) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        setSeasonError(null);
        setTeam(null);
        setStats(null);
        setTeamSquad([]);
        setTeamStanding(null);
        setMiniStandings([]);
        setSelectedStandingsGroup(null);
        setAvailableSeasons([]);
        setSelectedSeasonId(null);
        setLoadedSeasonId(null);

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
      cancelled = true;
    };
  }, [applyProfileData, id]);

  useEffect(() => {
    let cancelled = false;

    const fetchSeasonData = async () => {
      if (
        !id ||
        !team ||
        !selectedSeasonId ||
        selectedSeasonId === loadedSeasonId
      ) {
        return;
      }

      try {
        setSeasonLoading(true);
        setSeasonError(null);

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
      cancelled = true;
    };
  }, [applyProfileData, id, loadedSeasonId, selectedSeasonId, team]);

  const selectedSeason = useMemo(
    () =>
      availableSeasons.find(
        (season) => season.season_id === selectedSeasonId,
      ) ?? null,
    [availableSeasons, selectedSeasonId],
  );

  const selectedCompetitionId =
    selectedSeason?.tournament_id ?? team?.tournament_id ?? null;
  const selectedCompetitionName =
    selectedSeason?.tournament_name ?? team?.tournament_name ?? null;
  const selectedStatsPool = useMemo(
    () =>
      getTeamsBySeasonTournament(
        comparisonEntries,
        selectedSeasonId,
        selectedCompetitionId,
      ),
    [comparisonEntries, selectedCompetitionId, selectedSeasonId],
  );
  const headerSubtitle =
    [selectedCompetitionName, selectedSeason?.season_name]
      .filter(Boolean)
      .join(" - ") ||
    team?.city ||
    "Professional Club";

  const standingsLabel =
    [selectedCompetitionName, selectedSeason?.season_name]
      .filter(Boolean)
      .join(" - ") || "League Position";

  const handleSeasonChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeasonId(Number(event.target.value));
  };

  const fullStandingsPath = useMemo(() => {
    const params = new URLSearchParams();

    if (selectedCompetitionId) {
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
      params.set("tournamentName", selectedCompetitionName);
    }

    const query = params.toString();
    return query ? `/standings?${query}` : "/standings";
  }, [
    selectedSeasonId,
    selectedStandingsGroup,
    selectedCompetitionId,
    selectedCompetitionName,
  ]);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-widest">
        Loading Profile...
      </div>
    );
  if (error || !team)
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold uppercase tracking-widest text-rose-500">
        {error || "Team not found"}
      </div>
    );

  return (
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
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 p-6 md:p-10 shadow-2xl backdrop-blur-sm">
          {seasonError ? (
            <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-xs font-black uppercase tracking-widest text-rose-400">
              {seasonError}
            </div>
          ) : null}

          {activeTab === "standings" && (
            <TeamStandingsPreview
              seasonLoading={seasonLoading}
              standingsLabel={standingsLabel}
              teamId={id}
              teamStanding={teamStanding}
              miniStandings={miniStandings}
              fullStandingsPath={fullStandingsPath}
            />
          )}

          {activeTab === "squad" && <TeamSquadTable squad={teamSquad} />}
        </div>
      )}
    </ProfileLayout>
  );
}
