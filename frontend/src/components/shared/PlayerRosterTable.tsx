import type { KeyboardEvent, ReactNode } from "react";
import { Link, useNavigate, type To } from "react-router-dom";
import { cn, standingsTheme } from "../ui/design";

export type Player = {
  id: string;
  jerseyNumber: number | string;
  name: string;
  teamName: string;
  age: number | string;
  position: string;
  foot: string;
  nationality: string;
};

type PlayerRosterTablePlayer = Omit<
  Player,
  "age" | "id" | "teamName"
> & {
  id: number | string;
  slug?: string;
  age: number | string;
  teamName?: string | null;
};

type PlayerRosterTableLinkTarget =
  | To
  | {
      to: To;
      state?: unknown;
    };

export type PlayerRosterTableProps<
  TPlayer extends PlayerRosterTablePlayer = Player,
> = {
  players: TPlayer[];
  title?: string;
  className?: string;
  emptyMessage?: ReactNode;
  onPlayerClick?: (player: TPlayer) => void;
  getPlayerLink?: (player: TPlayer) => PlayerRosterTableLinkTarget;
};

const columns = [
  { label: "Jersey Number", className: "w-28 px-5 py-4 text-center md:py-5" },
  { label: "Player Name", className: "min-w-[320px] px-6 py-4 md:min-w-[380px] md:py-5" },
  { label: "Age", className: "w-24 px-6 py-4 text-center md:py-5" },
  { label: "Position", className: "w-36 px-6 py-4 md:py-5" },
  { label: "Foot", className: "w-28 px-6 py-4 md:py-5" },
  {
    label: "Nationality",
    className: "w-40 px-6 py-4 text-right md:py-5",
  },
] as const;

export default function PlayerRosterTable<
  TPlayer extends PlayerRosterTablePlayer = Player,
>({
  players,
  title,
  className,
  emptyMessage = "No players found.",
  onPlayerClick,
  getPlayerLink,
}: PlayerRosterTableProps<TPlayer>) {
  const navigate = useNavigate();

  return (
    <section className={cn("animate-in fade-in duration-300", className)}>
      {title ? (
        <h3 className="mb-5 text-xs font-black uppercase tracking-[0.25em] text-slate-400 md:mb-6">
          {title}
        </h3>
      ) : null}

      {players.length > 0 ? (
        <div className="overflow-x-auto rounded-[2rem] border border-slate-800/60 bg-slate-900/40 shadow-2xl backdrop-blur-xl md:rounded-[2.5rem]">
          <table className="w-full min-w-[940px] table-fixed text-left">
            <TableHeader />
            <tbody className="divide-y divide-slate-800/30">
              {players.map((player) => (
                <PlayerRosterRow
                  key={getPlayerKey(player)}
                  player={player}
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
        <EmptyState>{emptyMessage}</EmptyState>
      )}
    </section>
  );
}

function TableHeader() {
  return (
    <thead>
      <tr className={standingsTheme.tableHead}>
        {columns.map((column) => (
          <th key={column.label} scope="col" className={column.className}>
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function PlayerRosterRow<TPlayer extends PlayerRosterTablePlayer>({
  player,
  onPlayerClick,
  getPlayerLink,
  onNavigate,
}: {
  player: TPlayer;
  onPlayerClick?: (player: TPlayer) => void;
  getPlayerLink?: (player: TPlayer) => PlayerRosterTableLinkTarget;
  onNavigate: (target: PlayerRosterTableLinkTarget) => void;
}) {
  const linkTarget = getPlayerLink?.(player);
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

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (!isRowClickable || !["Enter", " "].includes(event.key)) {
      return;
    }

    event.preventDefault();
    handleRowClick();
  };

  return (
    <tr
      onClick={isRowClickable ? handleRowClick : undefined}
      onKeyDown={handleRowKeyDown}
      tabIndex={isRowClickable ? 0 : undefined}
      className={cn(
        "group transition-colors hover:bg-blue-500/[0.04] focus:outline-none focus-visible:bg-blue-500/[0.06]",
        isRowClickable && "cursor-pointer",
      )}
    >
      <td className="px-5 py-4 text-center text-sm font-black text-slate-500">
        {formatTableValue(player.jerseyNumber)}
      </td>
      <td className="px-6 py-4 font-bold text-slate-200">
        <div className="min-w-0">
          <PlayerNameContent player={player} linkTarget={linkTarget} />
        </div>
      </td>
      <td className="px-6 py-4 text-center text-sm font-bold text-slate-400">
        {formatTableValue(player.age)}
      </td>
      <td className="px-6 py-4 text-sm font-medium text-slate-400">
        {formatTableValue(player.position)}
      </td>
      <td className="px-6 py-4 text-sm font-medium text-slate-400">
        {formatTableValue(player.foot)}
      </td>
      <td className="px-6 py-4 text-right text-sm font-medium text-slate-400">
        {formatTableValue(player.nationality)}
      </td>
    </tr>
  );
}

function PlayerNameContent<TPlayer extends PlayerRosterTablePlayer>({
  player,
  linkTarget,
}: {
  player: TPlayer;
  linkTarget?: PlayerRosterTableLinkTarget;
}) {
  const className =
    "block max-w-[260px] truncate text-sm font-black uppercase italic tracking-normal text-slate-100 transition-colors group-hover:text-blue-400 sm:max-w-[340px] md:max-w-[380px] md:text-base";

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

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className={standingsTheme.emptyPanel} role="status">
      {children}
    </div>
  );
}

function normalizePlayerLinkTarget(target: PlayerRosterTableLinkTarget) {
  if (typeof target === "object" && "to" in target) {
    return target;
  }

  return {
    to: target,
    state: undefined,
  };
}

function getPlayerKey(player: PlayerRosterTablePlayer) {
  return player.slug ?? player.id;
}

function formatTableValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}
