-- =============================================================
-- Matrix — Triggerit
-- =============================================================

-- ---------- complete_game_when_confirmed ----------
-- Kun tulos on molemmin puolin vahvistettu, peli siirtyy completed-tilaan.
-- Definer-oikeuksin, koska games_update_respond-policy sallii käyttäjille
-- vain pending -> accepted/declined -siirron.
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
