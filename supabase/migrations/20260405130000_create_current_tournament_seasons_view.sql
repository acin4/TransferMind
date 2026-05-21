create or replace view public.current_tournament_seasons as
select
  s.tournament_id,
  s.id as season_id,
  s.api_id as season_api_id,
  s.name as season_name,
  s.year
from public.seasons s
where s.is_current = true
  and s.tournament_id is not null;