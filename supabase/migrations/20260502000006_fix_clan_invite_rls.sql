-- =============================================================
-- Fix: Salli clanin omistajan/adminin kutsua pelaajia
-- =============================================================

-- Poista vanha insert-politiikka ja luo uusi joka sallii:
-- 1) Pelaaja liittyy itse (user_id = auth.uid())
-- 2) Clanin omistaja/admin lisää toisen pelaajan
drop policy if exists clan_members_insert on public.clan_members;

create policy clan_members_insert on public.clan_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.clan_members cm
      where cm.clan_id = clan_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );
