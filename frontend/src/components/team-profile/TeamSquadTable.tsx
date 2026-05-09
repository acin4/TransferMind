import type { TeamProfilePlayer } from "../../api/api";
import PlayerTable from "../players/PlayerTable";
import {
  getPlayerRouteKey,
  normalizeTeamSquadPlayer,
} from "../../utils/playerTable";

type TeamSquadTableProps = {
  squad: TeamProfilePlayer[];
  teamId: number | string;
  teamName: string | null;
};

export default function TeamSquadTable({
  squad,
  teamId,
  teamName,
}: TeamSquadTableProps) {
  const tablePlayers = squad.map((player) =>
    normalizeTeamSquadPlayer(player, teamName),
  );

  return (
    <PlayerTable
      players={tablePlayers}
      title="Current Squad"
      teamName={teamName}
      emptyMessage="No squad players found."
      getPlayerLink={(player) => ({
        to: `/player/${getPlayerRouteKey(player)}`,
        state: {
          fromTeamId: teamId,
          fromTeamName: teamName,
        },
      })}
    />
  );
}
