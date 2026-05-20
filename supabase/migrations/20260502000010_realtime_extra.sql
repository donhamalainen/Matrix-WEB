-- =============================================================
-- Realtime — lisää uudet taulut publicationiin
-- =============================================================

-- Tiimipelaajat (2v2+ tuki)
alter publication supabase_realtime add table public.game_players;

-- Clan-järjestelmä
alter publication supabase_realtime add table public.clan_members;
alter publication supabase_realtime add table public.clan_invites;
alter publication supabase_realtime add table public.clan_join_requests;
