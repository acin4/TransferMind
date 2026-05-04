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

type PlayerProfileTabId = "statistics" | "info";

type PlayerProfileLocationState = {
  fromTeamId?: string | number;
  fromTeamName?: string;
  fromTournament?: string;
  fromTeamKey?: string;
};

export default function PlayerProfile() {
  const { id } = useParams();
  const location = useLocation();
  const playerProfileLocationState = useMemo(
    () => getPlayerProfileLocationState(location.state),
    [location.state],
  );
  const [player, setPlayer] = useState<PlayerListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] =
    useState<PlayerProfileTabId>("statistics");
  const [activeStatsCategory, setActiveStatsCategory] =
    useState<PlayerStatsCategoryId>("overview");

  useEffect(() => {
    let cancelled = false;

    const fetchPlayerData = async () => {
      try {
        if (!id) {
          setLoading(false);
          return;
        }

        setLoading(true);
        const data = await getPlayer(id);

        if (cancelled) {
          return;
        }

        setPlayer(data);
        setError(null);
      } catch (err) {
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
      cancelled = true;
    };
  }, [id]);

  const playerPosition = player?.position ?? null;
  const isGoalkeeper = isGoalkeeperPosition(playerPosition);
  const stats = player ? getPlayerStats(player) : null;
  const statCategories = useMemo(
    () => groupStatsByCategory(stats, playerPosition),
    [playerPosition, stats],
  );

  useEffect(() => {
    if (
      statCategories.length > 0 &&
      !statCategories.some((category) => category.id === activeStatsCategory)
    ) {
      setActiveStatsCategory(statCategories[0].id);
    }
  }, [activeStatsCategory, statCategories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-widest">
        Loading Profile...
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold uppercase tracking-widest text-rose-500">
        {error || "Player not found"}
      </div>
    );
  }

  const displayTeamName =
    playerProfileLocationState?.fromTeamName ?? getPlayerTeamName(player);
  const backState = playerProfileLocationState
    ? {
        selectedTournament: playerProfileLocationState.fromTournament,
        selectedTeamKey: playerProfileLocationState.fromTeamKey,
      }
    : undefined;
  const backLabel = playerProfileLocationState?.fromTeamName
    ? `Back to ${playerProfileLocationState.fromTeamName}`
    : "Back to Players";

  return (
    <ProfileLayout backTo="/players" backLabel={backLabel} backState={backState}>
      <PlayerHeader player={player} teamName={displayTeamName} />

      <PlayerProfileControls activeTab={activeTab} onTabChange={setActiveTab} />

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
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10 pb-8 border-b border-slate-800">
      <div>
        <h1 className="text-5xl font-black uppercase text-white tracking-tight italic">
          {player.name}
        </h1>
        <p className="text-blue-400 text-sm font-black mt-2 uppercase tracking-widest flex items-center gap-2">
          <UserRound size={14} className="text-blue-500" />
          Player ID {player.id}
        </p>
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
  const selectedStatsCategory = useMemo(
    () =>
      statCategories.find(
        (category) => category.id === activeStatsCategory,
      ) ?? statCategories[0],
    [activeStatsCategory, statCategories],
  );
  const visibleStats = selectedStatsCategory?.stats ?? [];

  return (
    <div className="animate-in fade-in duration-300">
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
              <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
                {visibleStats.map((stat) => (
                  <PlayerStatLine
                    key={stat.key}
                    label={stat.label}
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
    <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 p-6 md:p-10 shadow-2xl backdrop-blur-sm animate-in fade-in duration-300">
      <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">
        Player Info
      </h3>
      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
        {infoRows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-3 border-b border-slate-800/80 px-5 py-5 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-center sm:px-8"
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              {label}
            </span>
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
    return null;
  }

  return (
    <div className="flex items-center gap-2 min-w-0" title={value}>
      <span className="shrink-0 text-blue-500">{icon}</span>
      <span className="truncate text-sm font-bold text-slate-300">{value}</span>
    </div>
  );
}

function EmptyPanelMessage({ message }: { message: string }) {
  return (
    <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
      {message}
    </p>
  );
}

function formatHeight(value: PlayerListItem["height"]) {
  if (value === null || value === undefined || value === "") {
    return "\u2014";
  }

  return `${value} cm`;
}

function formatMarketValue(player: PlayerListItem) {
  const value = player.market_value;

  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const currency = getOptionalPlayerField(player, "market_value_currency");
  return [value, currency].filter(Boolean).join(" ");
}

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
    return null;
  }

  return {
    fromTeamId,
    fromTeamName,
    fromTournament,
    fromTeamKey,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
