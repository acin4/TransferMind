create extension if not exists pg_trgm with schema extensions;

create index if not exists players_team_id_name_idx
on public.players (team_id, name, id);

create index if not exists players_name_trgm_idx
on public.players using gin (name extensions.gin_trgm_ops);

create index if not exists player_stats_team_season_player_idx
on public.player_stats (team_id, season_id, player_id);

create index if not exists player_stats_player_latest_idx
on public.player_stats (player_id, id desc);
