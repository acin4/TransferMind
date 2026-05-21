alter table standings
add column if not exists standing_group_id bigint,
add column if not exists standing_group_name text,
add column if not exists stage_tournament_id bigint,
add column if not exists stage_tournament_name text,
add column if not exists stage_tournament_slug text;