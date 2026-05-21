create or replace view public.current_season_teams as
select distinct
  st.team_id,
  t.api_id as team_api_id,
  t.name as team_name,
  st.tournament_id,
  st.season_id
from public.standings st
join public.current_tournament_seasons cts
  on cts.tournament_id = st.tournament_id
 and cts.season_id = st.season_id
join public.teams t
  on t.id = st.team_id
where st.team_id is not null;