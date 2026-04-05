create or replace view public.current_tournament_seasons as
with current_seasons as (
  select
    s.id as season_id,
    s.api_id as season_api_id,
    s.name as season_name,
    s.year,
    s.tournament_id as raw_tournament_ref
  from public.seasons s
  where s.is_current = true
    and s.tournament_id is not null
),
matched_by_api as (
  select
    t.id as tournament_id,
    cs.season_id,
    cs.season_api_id,
    cs.season_name,
    cs.year,
    t.api_id as tournament_api_id
  from current_seasons cs
  join public.tournaments t
    on t.api_id = cs.raw_tournament_ref
),
matched_by_internal as (
  select
    t.id as tournament_id,
    cs.season_id,
    cs.season_api_id,
    cs.season_name,
    cs.year,
    t.api_id as tournament_api_id
  from current_seasons cs
  join public.tournaments t
    on t.id = cs.raw_tournament_ref
  where not exists (
    select 1
    from public.tournaments t2
    where t2.api_id = cs.raw_tournament_ref
  )
)
select * from matched_by_api
union all
select * from matched_by_internal;


create or replace view public.current_season_teams as
select distinct
  t.id as team_id,
  t.api_id as team_api_id,
  t.name as team_name,
  cts.tournament_id,
  cts.season_id,
  cts.tournament_api_id,
  cts.season_api_id
from public.standings st
join public.current_tournament_seasons cts
  on st.tournament_id = cts.tournament_api_id
 and st.season_id = cts.season_api_id
join public.teams t
  on t.api_id = st.team_id
where st.team_id is not null;