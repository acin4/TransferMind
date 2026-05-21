-- 1) Index for fast standings fetch by tournament + season + ordered position
create index if not exists standings_tournament_season_position_idx
on public.standings (tournament_id, season_id, position);

-- 2) Read policies for frontend access
-- Use anon + authenticated if this data is public in your app.
-- If you want only logged-in users, remove anon.

drop policy if exists "Public read standings" on public.standings;
create policy "Public read standings"
on public.standings
for select
to anon, authenticated
using (true);

drop policy if exists "Public read seasons" on public.seasons;
create policy "Public read seasons"
on public.seasons
for select
to anon, authenticated
using (true);

drop policy if exists "Public read teams" on public.teams;
create policy "Public read teams"
on public.teams
for select
to anon, authenticated
using (true);

drop policy if exists "Public read tournaments" on public.tournaments;
create policy "Public read tournaments"
on public.tournaments
for select
to anon, authenticated
using (true);

-- 3) Optional view for frontend-friendly standings rows
-- IMPORTANT:
-- joins are done on api_id because that is how your current standings table maps

create or replace view public.standings_with_team_info as
select
  s.id as standing_id,
  s.api_id as standing_api_id,

  s.tournament_id,
  t.id as tournament_db_id,
  t.name as tournament_name,
  t.country as tournament_country,
  t.flag_code as tournament_flag_code,

  s.season_id,
  se.id as season_db_id,
  se.name as season_name,
  se.year as season_year,
  se.is_current,

  s.team_id,
  tm.id as team_db_id,
  tm.name as team_name,
  tm.logo_url as team_logo_url,

  s.position,
  s.matches,
  s.wins,
  s.draws,
  s.losses,
  s.goals_for,
  s.goals_against,
  s.goal_diff,
  s.points
from public.standings s
left join public.teams tm
  on tm.api_id = s.team_id
left join public.seasons se
  on se.api_id = s.season_id
left join public.tournaments t
  on t.api_id = s.tournament_id;

grant select on public.standings_with_team_info to anon, authenticated;