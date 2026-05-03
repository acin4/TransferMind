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
  s.points,

  s.standing_group_id,
  s.standing_group_name,
  s.stage_tournament_id,
  s.stage_tournament_name,
  s.stage_tournament_slug
from public.standings s
left join public.teams tm
  on tm.api_id = s.team_id
left join public.tournaments t
  on t.api_id = s.tournament_id
left join public.seasons se
  on se.api_id = s.season_id
 and (
   se.tournament_id = s.tournament_id
   or se.tournament_id = t.id
 );

grant select on public.standings_with_team_info to anon, authenticated;
