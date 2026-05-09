import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  getPlayer,
  type PlayerListItem,
  type PlayerListStat,
} from "../api/api";
import ProfileLayout from "../components/profile/ProfileLayout";
import {
  getOptionalPlayerField,
  getPlayerCommonStats,
  getPlayerGoalkeeperStats,
  getPlayerOutfieldStats,
  getPlayerTeamName,
} from "../utils/playerDisplay";
import {
  formatStatValue,
  getStatValue,
  groupStatsBySection,
  isGoalkeeperPosition,
  type PlayerStatCategory,
} from "../utils/playerStats";
import { formatBirthDate } from "../utils/dateFormat";

// Optional navigation state passed when the user opens a player from a team page.
// It lets this page build a more helpful "Back to Team" label and preserve filters.
type PlayerProfileLocationState = {
  fromTeamId?: string | number;
  fromTeamName?: string;
  fromTournament?: string;
  fromTeamKey?: string;
  playersState?: unknown;
};

// PlayerProfile is a route page. It reads the player id from the URL, fetches
// that player's data from the backend, and renders the profile summary and stats.
export default function PlayerProfile() {
  // id comes from the route, for example /player/123.
  const { id } = useParams();
  // location.state can contain context about where the user came from.
  const location = useLocation();
  // Normalize location.state into a safe typed object. useMemo avoids repeating
  // this parsing work unless the router state changes.
  const playerProfileLocationState = useMemo(
    () => getPlayerProfileLocationState(location.state),
    [location.state],
  );
  // player stores the fetched profile data. null means it has not loaded or failed.
  const [player, setPlayer] = useState<PlayerListItem | null>(null);
  // loading controls the full-page loading state while the API call is running.
  const [loading, setLoading] = useState(true);
  // error stores a user-facing message when the player cannot be loaded.
  const [error, setError] = useState<string | null>(null);
  // Fetch player data whenever the URL id changes.
  useEffect(() => {
    // cancelled prevents stale requests from updating state after the component
    // unmounts or the user navigates to a different player quickly.
    let cancelled = false;

    const fetchPlayerData = async () => {
      try {
        if (!id) {
          // Without an id there is nothing to fetch, so stop loading.
          setLoading(false);
          return;
        }

        setLoading(true);
        // Backend call for the selected player profile.
        const data = await getPlayer(id);

        if (cancelled) {
          return;
        }

        setPlayer(data);
        setError(null);
      } catch (err) {
        // Keep the real error in the developer console and show a simple page message.
        console.error(err);

        if (!cancelled) {
          setPlayer(null);
          setError("Player not found.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPlayerData();

    return () => {
      // Mark this request as stale if the effect is cleaned up before it finishes.
      cancelled = true;
    };
  }, [id]);

  // Derived values turn the raw player object into UI-friendly state.
  const playerPosition = player?.position ?? null;
  // Goalkeepers use a different stat grouping/description than outfield players.
  const isGoalkeeper = isGoalkeeperPosition(playerPosition);
  const statSections = useMemo(
    () => (player ? buildPlayerStatSections(player, isGoalkeeper) : []),
    [isGoalkeeper, player],
  );

  if (loading) {
    // Full-screen loading state shown while the player request is in progress.
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-widest">
        Loading Profile...
      </div>
    );
  }

  if (error || !player) {
    // Full-screen error state shown when the request fails or returns no player.
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold uppercase tracking-widest text-rose-500">
        {error || "Player not found"}
      </div>
    );
  }

  // Prefer the team name from navigation state when available. That keeps the
  // header consistent with the team page the user came from.
  const displayTeamName =
    playerProfileLocationState?.fromTeamName ?? getPlayerTeamName(player);
  // backState preserves team-page filters when ProfileLayout navigates back.
  const backState = playerProfileLocationState
    ? playerProfileLocationState.playersState ?? {
        selectedTournament: playerProfileLocationState.fromTournament,
        selectedTeamKey: playerProfileLocationState.fromTeamKey,
      }
    : undefined;
  // The back label adapts based on whether the profile was opened from a team.
  const backLabel = playerProfileLocationState?.fromTeamName
    ? `Back to ${playerProfileLocationState.fromTeamName}`
    : "Back to Players";

  return (
    // ProfileLayout provides the shared profile page shell and back navigation.
    <ProfileLayout backTo="/players" backLabel={backLabel} backState={backState}>
      <PlayerHeader player={player} teamName={displayTeamName} />

      <PlayerStatsPanel
        sections={statSections}
        isGoalkeeper={isGoalkeeper}
      />
    </ProfileLayout>
  );
}

function PlayerHeader({
  player,
  teamName,
}: {
  player: PlayerListItem;
  teamName: string | null;
}) {
  return (
    // Header area: player name and key metadata appear at the top of the profile.
    <div className="mb-10 border-b border-slate-800 pb-8">
      <div className="max-w-4xl">
        <h1 className="text-5xl font-black uppercase text-white tracking-tight italic">
          {player.name}
        </h1>
        <PlayerProfileSummary player={player} teamName={teamName} />
      </div>
    </div>
  );
}

function PlayerProfileSummary({
  player,
  teamName,
}: {
  player: PlayerListItem;
  teamName: string | null;
}) {
  const summaryItems = [
    { label: "Team", value: formatProfileValue(teamName), hideLabel: true },
    {
      label: "Nationality",
      value: formatProfileValue(getOptionalPlayerField(player, "nationality")),
    },
    { label: "Position", value: formatProfileValue(player.position) },
    {
      label: "Date of Birth",
      value: formatBirthDateValue(
        getOptionalPlayerField(player, "date_of_birth"),
      ),
    },
    {
      label: "Preferred Foot",
      value: formatProfileValue(getOptionalPlayerField(player, "foot")),
    },
    { label: "Height", value: formatHeight(player.height) },
  ] as const;

  return (
    <dl className="mt-5 grid gap-x-12 gap-y-3 sm:grid-cols-2">
      {summaryItems.map(({ label, value, hideLabel }) => (
        <div
          key={label}
          className="flex min-w-0 flex-wrap gap-x-2 text-sm font-bold text-slate-300"
        >
          {!hideLabel ? (
            <dt className="shrink-0 text-slate-500">{label}:</dt>
          ) : (
            <dt className="sr-only">{label}</dt>
          )}
          <dd className="min-w-0 truncate text-slate-200" title={value}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PlayerStatsPanel({
  sections,
  isGoalkeeper,
}: {
  sections: PlayerStatSection[];
  isGoalkeeper: boolean;
}) {
  return (
    // Fade-in keeps the statistics card aligned with the app's profile-page motion.
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 p-6 md:p-10 shadow-2xl backdrop-blur-sm">
        <div className="mb-6">
          <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">
            Player Statistics
          </h3>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            {isGoalkeeper
              ? "Goalkeeper statistics"
              : "Latest available player stat row"}
          </p>
        </div>

        {sections.length > 0 ? (
          <div className="space-y-5">
            {sections.map((section) => (
              <PlayerStatSectionCard key={section.id} section={section} />
            ))}
          </div>
        ) : (
          <EmptyPanelMessage message="No stats available." />
        )}
      </div>
    </div>
  );
}

type PlayerStatSection = {
  id: string;
  title: string;
  stats: PlayerListStat;
  categories: PlayerStatCategory[];
};

function PlayerStatSectionCard({ section }: { section: PlayerStatSection }) {
  return (
    <div>
      <h4 className="mb-3 text-[11px] font-black uppercase tracking-widest text-blue-400">
        {section.title}
      </h4>
      <div className="space-y-4">
        {section.categories.map((category) => (
          <div key={category.id}>
            <div className="border-x border-t border-slate-800 bg-slate-950/40 px-5 py-3 first:rounded-t-3xl">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {category.label}
              </h5>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 overflow-hidden shadow-inner last:rounded-b-3xl">
              {category.stats.map((stat) => (
                <PlayerStatLine
                  key={stat.key}
                  label={stat.label}
                  value={formatStatValue(
                    getStatValue(section.stats, stat.key),
                    stat.format,
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerStatLine({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    // Responsive row: label and value stack on small screens, then become two
    // columns on larger screens. tabular-nums aligns numeric values neatly.
    <div className="grid gap-4 border-b border-slate-800/80 px-5 py-5 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-8">
      <span className="min-w-0 text-sm font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="text-lg font-black text-white tabular-nums">
        {value ?? "\u2014"}
      </span>
    </div>
  );
}

// Reusable empty-state message for stat categories and missing player stats.
function EmptyPanelMessage({ message }: { message: string }) {
  return (
    <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
      {message}
    </p>
  );
}

// Formats player height for display. Missing height uses an em dash so the table
// row still has a clear placeholder.
function formatHeight(value: PlayerListItem["height"]) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return `${value} cm`;
}

function formatProfileValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function formatBirthDateValue(value: string | null) {
  if (!value) {
    return "-";
  }

  const formattedDate = formatBirthDate(value);
  return formattedDate === "Unknown" ? "-" : formattedDate;
}

function buildPlayerStatSections(
  player: PlayerListItem,
  isGoalkeeper: boolean,
): PlayerStatSection[] {
  const commonStats = getPlayerCommonStats(player);
  const outfieldStats = getPlayerOutfieldStats(player);
  const goalkeeperStats = getPlayerGoalkeeperStats(player);
  const sections: PlayerStatSection[] = [];
  const commonCategories = groupStatsBySection(commonStats, "common");

  if (commonCategories.length > 0) {
    sections.push({
      id: "common",
      title: "Common Stats",
      stats: commonStats,
      categories: commonCategories,
    });
  }

  if (!isGoalkeeper && outfieldStats) {
    const outfieldCategories = groupStatsBySection(outfieldStats, "outfield");

    if (outfieldCategories.length > 0) {
      sections.push({
        id: "outfield",
        title: "Outfield Stats",
        stats: outfieldStats,
        categories: outfieldCategories,
      });
    }
  }

  if (goalkeeperStats) {
    const goalkeeperCategories = groupStatsBySection(
      goalkeeperStats,
      "goalkeeping",
    );

    if (goalkeeperCategories.length > 0) {
      sections.push({
        id: "goalkeeping",
        title: "Goalkeeper Stats",
        stats: goalkeeperStats,
        categories: goalkeeperCategories,
      });
    }
  }

  return sections;
}

// Safely reads router location.state into the shape this page understands.
// This is defensive because location.state can be anything or missing entirely.
function getPlayerProfileLocationState(
  value: unknown,
): PlayerProfileLocationState | null {
  if (!isRecord(value)) {
    return null;
  }

  const fromTeamName =
    typeof value.fromTeamName === "string" ? value.fromTeamName : undefined;
  const fromTeamKey =
    typeof value.fromTeamKey === "string" ? value.fromTeamKey : undefined;
  const fromTournament =
    typeof value.fromTournament === "string"
      ? value.fromTournament
      : undefined;
  const fromTeamId =
    typeof value.fromTeamId === "string" || typeof value.fromTeamId === "number"
      ? value.fromTeamId
      : undefined;
  const playersState =
    isRecord(value.playersState) ? value.playersState : undefined;

  if (
    !fromTeamName &&
    !fromTeamKey &&
    !fromTeamId &&
    !fromTournament &&
    !playersState
  ) {
    // Treat an empty state object the same as no state.
    return null;
  }

  return {
    fromTeamId,
    fromTeamName,
    fromTournament,
    fromTeamKey,
    playersState,
  };
}

// Small type guard that confirms an unknown value is an object-like record.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
