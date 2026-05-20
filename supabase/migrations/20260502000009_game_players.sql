-- =============================================================
-- Game Players — tiimipelaajat per peli
-- =============================================================

-- Jokaiseen peliin voi liittää pelaajia kahteen tiimiin (home/away).
-- 1v1-peleissä tätä ei tarvitse käyttää (retroyhteensopivuus).
-- 2v2+ peleissä kaikki pelaajat tallennetaan tänne.
create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  team text not null check (team in ('home', 'away')),
  unique (game_id, user_id)
);

create index if not exists game_players_game_idx on public.game_players(game_id);
create index if not exists game_players_user_idx on public.game_players(user_id);

-- RLS
alter table public.game_players enable row level security;

create policy game_players_select on public.game_players for select using (true);

-- Insert: pelin luoja (challenger) voi lisätä pelaajia.
create policy game_players_insert on public.game_players for insert
  with check (
    exists (
      select 1 from public.games g
      where g.id = game_id
        and g.challenger_id = auth.uid()
    )
  );

grant select on public.game_players to authenticated;
grant insert on public.game_players to authenticated;

-- Päivitä leaderboard view: huomioi sekä vanhat 1v1 (challenger/opponent)
-- että uudet tiimipelit (game_players).
-- DROP tarvitaan koska sarakkeiden tyypit muuttuvat (bigint -> int).
drop view if exists public.leaderboard;
create view public.leaderboard as
with
-- 1v1 pelit (ei game_players-rivejä) — käytetään vanhaa logiikkaa
solo_stats as (
  select
    u.id as user_id,
    u.nickname,
    g.sport,
    count(r.id) as games_played,
    sum(case
      when (g.challenger_id = u.id and r.score_challenger > r.score_opponent)
        or (g.opponent_id = u.id and r.score_opponent > r.score_challenger)
      then 1 else 0 end) as wins,
    sum(case when r.score_challenger = r.score_opponent then 1 else 0 end) as draws,
    sum(case
      when (g.challenger_id = u.id and r.score_challenger < r.score_opponent)
        or (g.opponent_id = u.id and r.score_opponent < r.score_challenger)
      then 1 else 0 end) as losses
  from public.users u
  join public.games g on (g.challenger_id = u.id or g.opponent_id = u.id)
  join public.results r on r.game_id = g.id
    and r.confirmed_by_challenger = true
    and r.confirmed_by_opponent = true
  where not exists (select 1 from public.game_players gp where gp.game_id = g.id)
  group by u.id, u.nickname, g.sport
),
-- Tiimipelit (game_players-rivit olemassa)
team_stats as (
  select
    u.id as user_id,
    u.nickname,
    g.sport,
    count(r.id) as games_played,
    sum(case
      when (gp.team = 'home' and r.score_challenger > r.score_opponent)
        or (gp.team = 'away' and r.score_opponent > r.score_challenger)
      then 1 else 0 end) as wins,
    sum(case when r.score_challenger = r.score_opponent then 1 else 0 end) as draws,
    sum(case
      when (gp.team = 'home' and r.score_challenger < r.score_opponent)
        or (gp.team = 'away' and r.score_opponent < r.score_challenger)
      then 1 else 0 end) as losses
  from public.users u
  join public.game_players gp on gp.user_id = u.id
  join public.games g on g.id = gp.game_id
  join public.results r on r.game_id = g.id
    and r.confirmed_by_challenger = true
    and r.confirmed_by_opponent = true
  group by u.id, u.nickname, g.sport
),
combined as (
  select * from solo_stats
  union all
  select * from team_stats
)
select
  user_id,
  nickname,
  sport,
  sum(games_played)::int as games_played,
  sum(wins)::int as wins,
  sum(draws)::int as draws,
  sum(losses)::int as losses,
  (sum(wins) * 3 + sum(draws))::int as points
from combined
group by user_id, nickname, sport;

-- Palauta grantit (drop poisti ne).
revoke select on public.leaderboard from anon;
grant  select on public.leaderboard to authenticated;
