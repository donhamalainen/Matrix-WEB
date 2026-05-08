-- =============================================================
-- Matrix — Ammattiopiston olympialaiset (15.5.2026)
-- Yksilöpohjainen haastejärjestelmä: pelaajat haastavat toisiaan
-- eri lajeissa ja kirjaavat tulokset.
-- =============================================================

-- ---------- USERS ----------
-- Profiili sidotaan suoraan auth.users -taulun id:hen.
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

-- USERS: id+nickname kaikille kirjautuneille, email/phone vain itselle (me-view).
revoke select on public.users from anon, authenticated;
grant  select (id, nickname, created_at) on public.users to authenticated;
create policy users_insert_self on public.users for insert with check (auth.uid() = id);
create policy users_update_self on public.users for update using (auth.uid() = id);

-- Self-only view: omat yhteystiedot.
create or replace view public.me
with (security_invoker = true) as
  select id, nickname, phone, email, created_at
  from public.users
  where id = auth.uid();
grant select on public.me to authenticated;

-- GAMES: kaikki luettavissa, luonti vain omalla nimellä.
-- Vastauksen voi tehdä vain vastustaja, ja vain pending -> accepted/declined.
-- Siirto completed-tilaan tapahtuu tuloksen vahvistuksen triggeristä.
create policy games_select on public.games for select using (true);
create policy games_insert on public.games for insert
  with check (challenger_id = auth.uid());
create policy games_update_respond on public.games for update
  using (opponent_id = auth.uid() and status = 'pending')
  with check (
    opponent_id = auth.uid()
    and status in ('accepted', 'declined')
  );

-- RESULTS: kaikki luettavissa, insert vain hyväksytyn pelin osapuolet.
-- Update sallittu vain niin kauan kun molemmat eivät ole vielä vahvistaneet.
create policy results_select on public.results for select using (true);
create policy results_insert on public.results for insert
  with check (
    recorded_by = auth.uid()
    and exists(
      select 1 from public.games g
      where g.id = game_id
        and g.status = 'accepted'
        and (g.challenger_id = auth.uid() or g.opponent_id = auth.uid())
    )
  );
create policy results_update on public.results for update
  using (
    not (confirmed_by_challenger and confirmed_by_opponent)
    and exists(
      select 1 from public.games g
      where g.id = game_id
        and g.status = 'accepted'
        and (g.challenger_id = auth.uid() or g.opponent_id = auth.uid())
    )
  )
  with check (
    exists(
      select 1 from public.games g
      where g.id = game_id
        and (g.challenger_id = auth.uid() or g.opponent_id = auth.uid())
    )
  );

-- Trigger: kun molemmat ovat vahvistaneet, peli completed-tilaan.
create or replace function public.complete_game_when_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.confirmed_by_challenger and new.confirmed_by_opponent then
    update public.games
       set status = 'completed'
     where id = new.game_id
       and status <> 'completed';
  end if;
  return new;
end;
$$;

drop trigger if exists results_complete_game on public.results;
create trigger results_complete_game
  after insert or update on public.results
  for each row execute function public.complete_game_when_confirmed();

-- Anna kirjautuneen lukea leaderboard-näkymä (ei anonille).
grant select on public.leaderboard to authenticated;
