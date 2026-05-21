export type TournamentOption = {
  id: number;
  name: string;
};

export type SeasonOption = {
  season_id: number;
  season_name?: string | null;
  is_current?: boolean;
};
