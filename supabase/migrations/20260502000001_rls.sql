-- =============================================================
-- Matrix — Row Level Security -politiikat ja grants
-- =============================================================

alter table public.users   enable row level security;
alter table public.games   enable row level security;
alter table public.results enable row level security;

-- =============================================================
-- USERS
-- =============================================================
-- SELECT-policy sallii rivien lukemisen, mutta column grant rajaa
-- näkyvät sarakkeet kirjautuneille pelkkiin id/nickname/created_at:hen.
-- Email/phone luetaan vain me-viewin kautta (definer-oikeudet, sisäinen
-- where id = auth.uid() rajaa omiin tietoihin).

revoke select on public.users from anon, authenticated;
grant  select (id, nickname, created_at) on public.users to authenticated;

create policy users_select       on public.users for select using (true);
create policy users_insert_self  on public.users for insert with check (auth.uid() = id);
create policy users_update_self  on public.users for update using (auth.uid() = id);

grant select on public.me to authenticated;

-- =============================================================
-- GAMES
-- =============================================================
-- - SELECT: kaikki kirjautuneet näkevät pelit.
-- - INSERT: vain omalla challenger_id:llä.
-- - UPDATE: vain vastustaja, ja vain siirto pending -> accepted/declined.
--   Siirto completed-tilaan tehdään triggerillä (ks. triggers-migraatio).

create policy games_select on public.games for select using (true);

create policy games_insert on public.games for insert
  with check (challenger_id = auth.uid());

create policy games_update_respond on public.games for update
  using (opponent_id = auth.uid() and status = 'pending')
  with check (
    opponent_id = auth.uid()
    and status in ('accepted', 'declined')
  );

-- =============================================================
-- RESULTS
-- =============================================================
-- - SELECT: kaikki kirjautuneet.
-- - INSERT: vain pelin osapuoli, peli accepted-tilassa, recorded_by = self.
-- - UPDATE: sallittu kun molemmat eivät ole vielä vahvistaneet
--   (vahvistettu tulos = immuuttinen).

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

-- =============================================================
-- LEADERBOARD
-- =============================================================
-- Vain kirjautuneille (ei anon-roolille).
revoke select on public.leaderboard from anon;
grant  select on public.leaderboard to authenticated;
