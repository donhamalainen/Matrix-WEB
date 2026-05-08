-- =============================================================
-- Matrix — Security hardening (8.5.2026)
-- Korjaa kriittiset RLS- ja tilakoneongelmat:
--   1+2) Vain vastustaja voi vastata haasteeseen, ja vain
--        siirrolla pending -> accepted/declined.
--   3)   Tulosta voi kirjata vain accepted-pelille, ja
--        kahdesti vahvistettu tulos on immuuttinen.
--        completed-tilaan siirtyminen tehdään triggerillä.
--   4)   Käyttäjien email/phone näkyvät vain itselle (me-view).
--        Leaderboardia ei enää vuodeta anonyymeille.
-- =============================================================

-- ---------- USERS: column-level grants ----------
-- Poistetaan laaja SELECT ja annetaan vain id+nickname kaikille
-- kirjautuneille. Email ja phone luetaan vain me-viewin kautta.
revoke select on public.users from anon, authenticated;
grant  select (id, nickname, created_at) on public.users to authenticated;

-- Self-only view: omat yhteystiedot.
create or replace view public.me
with (security_invoker = true) as
  select id, nickname, phone, email, created_at
  from public.users
  where id = auth.uid();

grant select on public.me to authenticated;

-- ---------- LEADERBOARD: vain kirjautuneille ----------
revoke select on public.leaderboard from anon;

-- ---------- GAMES: tiukennettu update-politiikka ----------
drop policy if exists games_update on public.games;

-- Vain vastustaja voi siirtää pending -> accepted/declined.
create policy games_update_respond on public.games for update
  using  (opponent_id = auth.uid() and status = 'pending')
  with check (
    opponent_id = auth.uid()
    and status in ('accepted', 'declined')
  );

-- ---------- RESULTS: status- ja immuutta-rajoitus ----------
drop policy if exists results_insert on public.results;
drop policy if exists results_update on public.results;

-- Insert sallittu vain hyväksytylle pelille ja oman id:n alla.
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

-- Update sallittu vain kun ei ole vielä vahvistettu molemmin puolin.
-- with check varmistaa, ettei game_id:tä tai recorded_by:tä voi ohjata muille.
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

-- ---------- TRIGGER: aseta peli completed kun molemmat vahvistivat ----------
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
