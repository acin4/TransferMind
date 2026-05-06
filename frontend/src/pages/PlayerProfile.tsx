import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Ruler, UserRound, Users } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import {
  getPlayer,
  type PlayerListItem,
  type PlayerListStat,
} from "../api/api";
import ProfileLayout from "../components/profile/ProfileLayout";
import SegmentedTabs from "../components/ui/SegmentedTabs";
import {
  getOptionalPlayerField,
  getPlayerTeamName,
  getPlayerStats,
} from "../utils/playerDisplay";
import {
  formatStatValue,
  getStatValue,
  groupStatsByCategory,
  isGoalkeeperPosition,
  type PlayerStatCategoryId,
} from "../utils/playerStats";

// The player profile has two top-level tabs: one for stats and one for general info.
type PlayerProfileTabId = "statistics" | "info";

// Optional navigation state passed when the user opens a player from a team page.
// It lets this page build a more helpful "Back to Team" label and preserve filters.
type PlayerProfileLocationState = {
  fromTeamId?: string | number;
  fromTeamName?: string;
  fromTournament?: string;
  fromTeamKey?: string;
};

// PlayerProfile is a route page. It reads the player id from the URL, fetches
// that player's data from the backend, and renders profile tabs.
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
  // activeTab controls whether the user sees Statistics or Info.
  const [activeTab, setActiveTab] =
    useState<PlayerProfileTabId>("statistics");
  // activeStatsCategory controls which stat category tab is selected inside the
  // Statistics panel.
  const [activeStatsCategory, setActiveStatsCategory] =
    useState<PlayerStatsCategoryId>("overview");

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
  // getPlayerStats extracts the stat row from the player object when available.
  const stats = player ? getPlayerStats(player) : null;
  // Group stats into category tabs so the Statistics panel is easier to scan.
  const statCategories = useMemo(
    () => groupStatsByCategory(stats, playerPosition),
    [playerPosition, stats],
  );

  // If the current active category disappears after stats load/change, select
  // the first available category so the UI never points at a missing tab.
  useEffect(() => {
    if (
      statCategories.length > 0 &&
      !statCategories.some((category) => category.id === activeStatsCategory)
    ) {
      setActiveStatsCategory(statCategories[0].id);
    }
  }, [activeStatsCategory, statCategories]);

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
    ? {
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

      <PlayerProfileControls activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main tab content switches between statistical data and general player info. */}
      {activeTab === "statistics" ? (
        <PlayerStatsPanel
          stats={stats}
          statCategories={statCategories}
          isGoalkeeper={isGoalkeeper}
          activeStatsCategory={activeStatsCategory}
          onStatsCategoryChange={setActiveStatsCategory}
        />
      ) : (
        <PlayerInfoPanel player={player} teamName={displayTeamName} />
      )}
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
    // It stacks on mobile and can spread horizontally on wider screens.
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10 pb-8 border-b border-slate-800">
      <div>
        <h1 className="text-5xl font-black uppercase text-white tracking-tight italic">
          {player.name}
        </h1>
        {/* Player id is useful for debugging and for matching the profile to data. */}
        <p className="text-blue-400 text-sm font-black mt-2 uppercase tracking-widest flex items-center gap-2">
          <UserRound size={14} className="text-blue-500" />
          Player ID {player.id}
        </p>
        {/* Metadata lines only render when they have a value, keeping the header clean. */}
        <div className="mt-4 space-y-2">
          <HeaderMetaLine
            icon={<Users size={14} />}
            value={teamName}
          />
          <HeaderMetaLine
            icon={<Ruler size={14} />}
            value={formatHeight(player.height)}
          />
        </div>
      </div>
    </div>
  );
}

function PlayerProfileControls({
  activeTab,
  onTabChange,
}: {
  activeTab: PlayerProfileTabId;
  onTabChange: (tab: PlayerProfileTabId) => void;
}) {
  return (
    // SegmentedTabs gives the user a compact two-option switch between page views.
    <SegmentedTabs
      items={[
        { value: "statistics", label: "Statistics" },
        { value: "info", label: "Info" },
      ]}
      value={activeTab}
      onChange={onTabChange}
      className="flex gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full md:w-max"
      buttonClassName="px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
    />
  );
}

function PlayerStatsPanel({
  stats,
  statCategories,
  isGoalkeeper,
  activeStatsCategory,
  onStatsCategoryChange,
}: {
  stats: PlayerListStat | null;
  statCategories: ReturnType<typeof groupStatsByCategory>;
  isGoalkeeper: boolean;
  activeStatsCategory: PlayerStatsCategoryId;
  onStatsCategoryChange: (category: PlayerStatsCategoryId) => void;
}) {
  // Find the currently selected category. If it is missing, fall back to the
  // first available category so the panel can still render safely.
  const selectedStatsCategory = useMemo(
    () =>
      statCategories.find(
        (category) => category.id === activeStatsCategory,
      ) ?? statCategories[0],
    [activeStatsCategory, statCategories],
  );
  // visibleStats is the list of stat rows shown in the current category tab.
  const visibleStats = selectedStatsCategory?.stats ?? [];

  return (
    // Fade-in gives the tab switch a small visual transition.
    <div className="animate-in fade-in duration-300">
      {/* Stats card groups category tabs and stat rows into one panel. */}
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

        {stats ? (
          <>
            {/* Category tabs let users move between groups like overview, attacking,
                defending, or goalkeeper-specific stats. */}
            <SegmentedTabs
              items={statCategories.map((category) => ({
                value: category.id,
                label: `${category.label} (${category.stats.length})`,
              }))}
              value={activeStatsCategory}
              onChange={onStatsCategoryChange}
              className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-1.5"
              buttonClassName="min-w-max overflow-hidden text-ellipsis whitespace-nowrap rounded-xl px-3 py-2.5 text-[8px] font-black uppercase tracking-wide transition-all sm:px-4 sm:text-[9px] md:text-[10px]"
            />

            {visibleStats.length > 0 ? (
              // Stat rows are wrapped in a bordered card so they read like a table.
              <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
                {visibleStats.map((stat) => (
                  <PlayerStatLine
                    key={stat.key}
                    label={stat.label}
                    // getStatValue reads the raw stat; formatStatValue turns it
                    // into display text based on the stat's configured format.
                    value={formatStatValue(
                      getStatValue(stats, stat.key),
                      stat.format,
                    )}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanelMessage message="No populated stats in this category." />
            )}
          </>
        ) : (
          <EmptyPanelMessage message="No statistics found for this player." />
        )}
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

function PlayerInfoPanel({
  player,
  teamName,
}: {
  player: PlayerListItem;
  teamName: string | null;
}) {
  // infoRows is a simple label/value list so the JSX below can render one
  // consistent row for every profile detail.
  const infoRows = [
    ["Player ID", player.id],
    ["Team", teamName],
    ["Height", formatHeight(player.height)],
    ["Position", player.position],
    ["Nationality", getOptionalPlayerField(player, "nationality")],
    ["Date of Birth", getOptionalPlayerField(player, "date_of_birth")],
    ["Preferred Foot", getOptionalPlayerField(player, "foot")],
    ["Jersey Number", getOptionalPlayerField(player, "jersey_num")],
    ["Contract", getOptionalPlayerField(player, "contract")],
    ["Market Value", formatMarketValue(player)],
  ] as const;

  return (
    // Info panel matches the stats panel styling so tab switches feel consistent.
    <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 p-6 md:p-10 shadow-2xl backdrop-blur-sm animate-in fade-in duration-300">
      <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">
        Player Info
      </h3>
      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
        {infoRows.map(([label, value]) => (
          // The label is stable and unique in this list, so it works as the key.
          <div
            key={label}
            className="grid gap-3 border-b border-slate-800/80 px-5 py-5 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-center sm:px-8"
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              {label}
            </span>
            {/* truncate prevents long values, such as contract text, from breaking
                the row layout. Missing values show an em dash. */}
            <span className="min-w-0 truncate text-sm font-bold text-slate-200">
              {value || "\u2014"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeaderMetaLine({
  icon,
  value,
}: {
  icon: ReactNode;
  value: string | null | undefined;
}) {
  if (!value) {
    // Do not render empty metadata rows; blank labels would add visual noise.
    return null;
  }

  return (
    // title exposes the full value on hover if the visible text gets truncated.
    <div className="flex items-center gap-2 min-w-0" title={value}>
      <span className="shrink-0 text-blue-500">{icon}</span>
      <span className="truncate text-sm font-bold text-slate-300">{value}</span>
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
    return "\u2014";
  }

  return `${value} cm`;
}

// Combines market value and currency fields into one display string.
// If the player has no market value, return null so the info table shows a dash.
function formatMarketValue(player: PlayerListItem) {
  const value = player.market_value;

  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const currency = getOptionalPlayerField(player, "market_value_currency");
  return [value, currency].filter(Boolean).join(" ");
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

  if (!fromTeamName && !fromTeamKey && !fromTeamId && !fromTournament) {
    // Treat an empty state object the same as no state.
    return null;
  }

  return {
    fromTeamId,
    fromTeamName,
    fromTournament,
    fromTeamKey,
  };
}

// Small type guard that confirms an unknown value is an object-like record.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
