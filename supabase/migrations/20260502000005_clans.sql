-- =============================================================
-- Matrix — Clan/joukkue-järjestelmä
-- =============================================================

-- ---------- CLANS ----------
create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
    check (name = btrim(name))
    check (char_length(name) between 2 and 30),
  tag text not null unique
    check (tag = btrim(tag))
    check (char_length(tag) between 2 and 6),
  description text default '',
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists clans_owner_idx on public.clans(owner_id);

-- ---------- CLAN MEMBERS ----------
-- Jäsen voi kuulua vain yhteen claniin kerrallaan (unique user_id).
create table if not exists public.clan_members (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (user_id)  -- pelaaja vain yhdessä clanissa
);

create index if not exists clan_members_clan_idx on public.clan_members(clan_id);
create index if not exists clan_members_user_idx on public.clan_members(user_id);

-- ---------- TEAM SIZE games-tauluun ----------
alter table public.games add column if not exists team_size int not null default 1
  check (team_size >= 1);

-- ---------- RLS ----------
alter table public.clans        enable row level security;
alter table public.clan_members enable row level security;

-- Kaikki kirjautuneet voivat lukea clanit ja jäsenet.
create policy clans_select on public.clans for select using (true);
create policy clan_members_select on public.clan_members for select using (true);

-- Clanin luonti: kuka tahansa kirjautunut.
create policy clans_insert on public.clans for insert
  with check (owner_id = auth.uid());

-- Clanin päivitys: vain omistaja.
create policy clans_update on public.clans for update
  using (owner_id = auth.uid());

-- Clanin poisto: vain omistaja.
create policy clans_delete on public.clans for delete
  using (owner_id = auth.uid());

-- Jäsenyys: käyttäjä voi liittyä itse (user_id = self).
create policy clan_members_insert on public.clan_members for insert
  with check (user_id = auth.uid());

-- Jäsenyys poisto: itse tai clanin omistaja.
create policy clan_members_delete on public.clan_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.clans c
      where c.id = clan_id and c.owner_id = auth.uid()
    )
  );

-- Jäsen roolin päivitys: vain clanin omistaja.
create policy clan_members_update on public.clan_members for update
  using (
    exists (
      select 1 from public.clans c
      where c.id = clan_id and c.owner_id = auth.uid()
    )
  );

-- Grants
grant select on public.clans to authenticated;
grant insert on public.clans to authenticated;
grant update on public.clans to authenticated;
grant delete on public.clans to authenticated;

grant select on public.clan_members to authenticated;
grant insert on public.clan_members to authenticated;
grant update on public.clan_members to authenticated;
grant delete on public.clan_members to authenticated;
