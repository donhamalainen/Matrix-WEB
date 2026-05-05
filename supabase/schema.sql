-- =============================================================
-- Matrix — Ammattiopiston olympialaiset (15.5.2026)
-- Yksilöpohjainen haastejärjestelmä: pelaajat haastavat toisiaan
-- eri lajeissa ja kirjaavat tulokset.
-- =============================================================

-- ---------- USERS ----------
-- Profiili sidotaan suoraan auth.users -taulun id:hen.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

-- ---------- GAMES (haasteet / pelit) ----------
-- Yksilöiden väliset haasteet. Haastaja haastaa vastustajan tietyssä lajissa.
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.users(id) on delete cascade,
  opponent_id uuid not null references public.users(id) on delete cascade,
  sport text not null check (sport in ('football', 'basketball', 'pingpong')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'completed')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  check (challenger_id <> opponent_id)
);

create index if not exists games_challenger_idx on public.games(challenger_id);
create index if not exists games_opponent_idx on public.games(opponent_id);
create index if not exists games_status_idx on public.games(status);

-- ---------- RESULTS (tulokset) ----------
-- Pelin tulos. Molemmat osapuolet vahvistavat tuloksen.
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.games(id) on delete cascade,
  score_challenger int not null check (score_challenger >= 0),
  score_opponent int not null check (score_opponent >= 0),
  confirmed_by_challenger boolean not null default false,
  confirmed_by_opponent boolean not null default false,
  recorded_by uuid not null references public.users(id),
  played_at timestamptz not null default now()
);

-- =============================================================
-- LEADERBOARD VIEW — yksilökohtainen
-- Laskee pelaajalle voitot/tappiot/tasapelit/pisteet per laji.
-- Vain molemmin puolin vahvistetut tulokset lasketaan.
-- =============================================================

create or replace view public.leaderboard as
select
  u.id as user_id,
  u.nickname,
  g.sport,
  count(r.id) as games_played,
  sum(case
    when (g.challenger_id = u.id and r.score_challenger > r.score_opponent)
      or (g.opponent_id   = u.id and r.score_opponent   > r.score_challenger)
    then 1 else 0 end) as wins,
  sum(case when r.score_challenger = r.score_opponent then 1 else 0 end) as draws,
  sum(case
    when (g.challenger_id = u.id and r.score_challenger < r.score_opponent)
      or (g.opponent_id   = u.id and r.score_opponent   < r.score_challenger)
    then 1 else 0 end) as losses,
  sum(case
    when (g.challenger_id = u.id and r.score_challenger > r.score_opponent)
      or (g.opponent_id   = u.id and r.score_opponent   > r.score_challenger)
    then 3
    when r.score_challenger = r.score_opponent then 1
    else 0 end) as points
from public.users u
join public.games g on g.challenger_id = u.id or g.opponent_id = u.id
join public.results r on r.game_id = g.id
  and r.confirmed_by_challenger = true
  and r.confirmed_by_opponent   = true
group by u.id, u.nickname, g.sport;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table public.users   enable row level security;
alter table public.games   enable row level security;
alter table public.results enable row level security;

-- USERS: jokainen voi lukea, vain omistaja muokkaa / luo.
create policy users_select on public.users for select using (true);
create policy users_insert_self on public.users for insert with check (auth.uid() = id);
create policy users_update_self on public.users for update using (auth.uid() = id);

-- GAMES: kaikki luettavissa, luonti vain omalla nimellä.
create policy games_select on public.games for select using (true);
create policy games_insert on public.games for insert
  with check (challenger_id = auth.uid());
create policy games_update on public.games for update using (
  challenger_id = auth.uid() or opponent_id = auth.uid()
);

-- RESULTS: kaikki luettavissa, insert/update vain pelin osapuolet.
create policy results_select on public.results for select using (true);
create policy results_insert on public.results for insert
  with check (
    exists(
      select 1 from public.games g
      where g.id = game_id
        and (g.challenger_id = auth.uid() or g.opponent_id = auth.uid())
    )
    and recorded_by = auth.uid()
  );
create policy results_update on public.results for update using (
  exists(
    select 1 from public.games g
    where g.id = game_id
      and (g.challenger_id = auth.uid() or g.opponent_id = auth.uid())
  )
);

-- Anna kirjautuneen lukea leaderboard-näkymä.
grant select on public.leaderboard to anon, authenticated;
