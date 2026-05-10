-- =============================================================
-- Matrix — Tietokannan rakenne (taulut + indeksit + näkymät)
-- Ammattiopiston olympialaiset (15.5.2026)
-- =============================================================

-- ---------- USERS ----------
-- Profiili sidotaan suoraan auth.users -taulun id:hen.
-- Nimimerkki 2–20 merkkiä, ei whitespacea reunoissa.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique
    check (nickname = btrim(nickname))
    check (char_length(nickname) between 2 and 20),
  phone text,
  email text,
  created_at timestamptz not null default now()
);

-- ---------- GAMES (haasteet / pelit) ----------
-- Yksilöiden väliset haasteet. Haastaja haastaa vastustajan tietyssä lajissa.
-- Tilakone: pending → accepted/declined → completed (completed asetetaan
-- triggerillä kun molemmat ovat vahvistaneet tuloksen).
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.users(id) on delete cascade,
  opponent_id uuid not null references public.users(id) on delete cascade,
  sport text not null check (sport in (
    'football', 'basketball', 'pingpong',
    'volleyball', 'tennis', 'badminton',
    'icehockey', 'darts', 'billiards', 'other'
  )),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'completed')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  check (challenger_id <> opponent_id)
);

create index if not exists games_challenger_idx on public.games(challenger_id);
create index if not exists games_opponent_idx   on public.games(opponent_id);
create index if not exists games_status_idx     on public.games(status);

-- ---------- RESULTS (tulokset) ----------
-- Pelin tulos. Molemmat osapuolet vahvistavat. Vahvistettu tulos on
-- immuuttinen (RLS estää muutokset).
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.games(id) on delete cascade,
  score_challenger int not null check (score_challenger >= 0),
  score_opponent   int not null check (score_opponent   >= 0),
  confirmed_by_challenger boolean not null default false,
  confirmed_by_opponent   boolean not null default false,
  recorded_by uuid not null references public.users(id),
  played_at timestamptz not null default now()
);

-- ---------- LEADERBOARD VIEW ----------
-- Pelaajakohtainen tilasto per laji. Vain molemmin puolin vahvistetut
-- tulokset lasketaan.
create or replace view public.leaderboard as
select
  u.id   as user_id,
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
join public.games   g on g.challenger_id = u.id or g.opponent_id = u.id
join public.results r on r.game_id = g.id
  and r.confirmed_by_challenger = true
  and r.confirmed_by_opponent   = true
group by u.id, u.nickname, g.sport;

-- ---------- ME VIEW ----------
-- Omat yhteystiedot (phone, email). Ei security_invoker — view ajetaan
-- owner-oikeuksin, ja sisäinen where rajaa kutsujan omiin tietoihin.
create or replace view public.me as
  select id, nickname, phone, email, created_at
  from public.users
  where id = auth.uid();
