-- =============================================================
-- Clan kutsujärjestelmä — pelaaja hyväksyy/hylkää kutsun
-- =============================================================

-- ---------- CLAN INVITES ----------
create table if not exists public.clan_invites (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  invited_user_id uuid not null references public.users(id) on delete cascade,
  invited_by uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  -- Vain yksi pending-kutsu per pelaaja per clan.
  unique (clan_id, invited_user_id)
);

create index if not exists clan_invites_user_idx on public.clan_invites(invited_user_id);
create index if not exists clan_invites_clan_idx on public.clan_invites(clan_id);

-- ---------- RLS ----------
alter table public.clan_invites enable row level security;

-- Kaikki kirjautuneet voivat lukea kutsuja (tarvitaan jotta kutsulistat toimivat).
create policy clan_invites_select on public.clan_invites for select using (true);

-- Insert: clanin omistaja/admin voi kutsua.
create policy clan_invites_insert on public.clan_invites for insert
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.clan_members cm
      where cm.clan_id = clan_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- Update: vain kutsuttu pelaaja voi vastata (accept/decline).
create policy clan_invites_update on public.clan_invites for update
  using (invited_user_id = auth.uid() and status = 'pending');

-- Delete: kutsuja (omistaja/admin) tai kutsuttu voi poistaa.
create policy clan_invites_delete on public.clan_invites for delete
  using (
    invited_user_id = auth.uid()
    or invited_by = auth.uid()
  );

-- Grants
grant select on public.clan_invites to authenticated;
grant insert on public.clan_invites to authenticated;
grant update on public.clan_invites to authenticated;
grant delete on public.clan_invites to authenticated;

-- Poista donboggo:n suora jäsenyys joka lisättiin vahingossa
-- (tarvittaessa manuaalisesti, ei aja automaattisesti):
-- delete from public.clan_members where user_id = (select id from public.users where nickname = 'donboggo');
