import type { ReactNode } from "react";
import { Link, useNavigate, type To } from "react-router-dom";

type PlayerTableIdentity =
  | {
      id: number | string;
      slug?: string;
    }
  | {
      id?: number | string;
      slug: string;
    };

export type PlayerTablePlayer = PlayerTableIdentity & {
  jerseyNumber: string;
  name: string;
  age: string;
  position: string;
  foot: string;
  nationality: string;
  photoUrl?: string | null;
  metadata?: string | null;
};

type PlayerTableLinkTarget =
  | To
  | {
      to: To;
      state?: unknown;
    };

type PlayerTableProps<TPlayer extends PlayerTablePlayer> = {
  players: TPlayer[];
  title?: ReactNode;
  teamName?: string | null;
  emptyMessage?: ReactNode;
  onPlayerClick?: (player: TPlayer) => void;
  getPlayerLink?: (player: TPlayer) => PlayerTableLinkTarget;
};

export default function PlayerTable<TPlayer extends PlayerTablePlayer>({
  players,
  title,
  teamName,
  emptyMessage = "No players found.",
  onPlayerClick,
  getPlayerLink,
}: PlayerTableProps<TPlayer>) {
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in duration-300">
      {title ? (
        <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">
          {title}
        </h3>
      ) : null}

      {players.length > 0 ? (
        <div className="overflow-x-auto bg-slate-900/50 rounded-3xl border border-slate-800 p-2 shadow-inner">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800/80 bg-slate-900/50">
                <th className="w-28 py-5 pl-6 font-normal rounded-tl-2xl">
                  Jersey number
                </th>
                <th className="py-5 font-normal">Player name</th>
                <th className="w-24 py-5 font-normal">Age</th>
                <th className="w-32 py-5 font-normal">Position</th>
                <th className="w-28 py-5 font-normal">Foot</th>
                <th className="w-36 py-5 pr-6 font-normal text-right rounded-tr-2xl">
                  Nationality
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {players.map((player) => (
                <PlayerTableRow
                  key={getPlayerKey(player)}
                  player={player}
                  teamName={teamName}
                  onPlayerClick={onPlayerClick}
                  getPlayerLink={getPlayerLink}
                  onNavigate={(target) => {
                    const destination = normalizePlayerLinkTarget(target);
                    navigate(destination.to, { state: destination.state });
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-500 italic bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center font-bold">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

function PlayerTableRow<TPlayer extends PlayerTablePlayer>({
  player,
  teamName,
  onPlayerClick,
  getPlayerLink,
  onNavigate,
}: {
  player: TPlayer;
  teamName?: string | null;
  onPlayerClick?: (player: TPlayer) => void;
  getPlayerLink?: (player: TPlayer) => PlayerTableLinkTarget;
  onNavigate: (target: PlayerTableLinkTarget) => void;
}) {
  const linkTarget = getPlayerLink?.(player);
  const metadata = player.metadata ?? teamName ?? null;
  const isRowClickable = Boolean(onPlayerClick || linkTarget);

  const handleRowClick = () => {
    if (onPlayerClick) {
      onPlayerClick(player);
      return;
    }

    if (linkTarget) {
      onNavigate(linkTarget);
    }
  };

  return (
    <tr
      onClick={isRowClickable ? handleRowClick : undefined}
      className={`hover:bg-slate-800/40 transition-colors group ${
        isRowClickable ? "cursor-pointer" : ""
      }`}
    >
      <td className="py-4 pl-6 text-sm font-black text-slate-500">
        {formatTableValue(player.jerseyNumber)}
      </td>
      <td className="py-4 font-bold text-slate-200">
        <div className="flex min-w-0 items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-sm font-black overflow-hidden shrink-0 border border-slate-700 group-hover:border-blue-500 transition-colors">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              getPlayerInitial(player.name)
            )}
          </div>
          <div className="min-w-0">
            <PlayerNameContent player={player} linkTarget={linkTarget} />
            {metadata ? (
              <span className="mt-1 block truncate max-w-[180px] sm:max-w-[280px] text-xs font-bold text-slate-500">
                {metadata}
              </span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="py-4 text-sm font-bold text-slate-400">
        {formatTableValue(player.age)}
      </td>
      <td className="py-4 text-sm font-medium text-slate-400">
        {formatTableValue(player.position)}
      </td>
      <td className="py-4 text-sm font-medium text-slate-400">
        {formatTableValue(player.foot)}
      </td>
      <td className="py-4 pr-6 text-right text-sm font-medium text-slate-400">
        {formatTableValue(player.nationality)}
      </td>
    </tr>
  );
}

function PlayerNameContent<TPlayer extends PlayerTablePlayer>({
  player,
  linkTarget,
}: {
  player: TPlayer;
  linkTarget?: PlayerTableLinkTarget;
}) {
  const className =
    "block truncate max-w-[180px] sm:max-w-[280px] text-sm md:text-base group-hover:text-blue-400 transition-colors";

  if (!linkTarget) {
    return <span className={className}>{player.name}</span>;
  }

  if (typeof linkTarget === "object" && "to" in linkTarget) {
    return (
      <Link
        to={linkTarget.to}
        state={linkTarget.state}
        className={className}
        onClick={(event) => event.stopPropagation()}
      >
        {player.name}
      </Link>
    );
  }

  return (
    <Link
      to={linkTarget}
      className={className}
      onClick={(event) => event.stopPropagation()}
    >
      {player.name}
    </Link>
  );
}

function normalizePlayerLinkTarget(target: PlayerTableLinkTarget) {
  if (typeof target === "object" && "to" in target) {
    return target;
  }

  return {
    to: target,
    state: undefined,
  };
}

function getPlayerInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function getPlayerKey(player: PlayerTablePlayer) {
  return player.slug ?? player.id;
}

function formatTableValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}
