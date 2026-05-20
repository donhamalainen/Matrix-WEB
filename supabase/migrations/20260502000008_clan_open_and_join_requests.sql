-- =============================================================
-- Avoin/suljettu clan + liittymispyynnöt (join requests)
-- =============================================================

-- Lisää open-kenttä claneihin (true = avoin, false = suljettu).
alter table public.clans add column if not exists open boolean not null default true;

-- ---------- JOIN REQUESTS ----------
-- Kun pelaaja yrittää liittyä suljettuun claniin, syntyy pyyntö.
create table if not exists public.clan_join_requests (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (clan_id, user_id)
);

create index if not exists clan_join_requests_clan_idx on public.clan_join_requests(clan_id);
create index if not exists clan_join_requests_user_idx on public.clan_join_requests(user_id);

-- RLS
alter table public.clan_join_requests enable row level security;

create policy clan_join_requests_select on public.clan_join_requests for select using (true);

-- Pelaaja voi luoda pyynnön (user_id = self).
create policy clan_join_requests_insert on public.clan_join_requests for insert
  with check (user_id = auth.uid());

-- Omistaja/admin voi päivittää (hyväksyä/hylätä).
create policy clan_join_requests_update on public.clan_join_requests for update
  using (
    exists (
      select 1 from public.clan_members cm
      where cm.clan_id = clan_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- Poisto: pyytäjä tai omistaja.
create policy clan_join_requests_delete on public.clan_join_requests for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.clan_members cm
      where cm.clan_id = clan_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

grant select on public.clan_join_requests to authenticated;
grant insert on public.clan_join_requests to authenticated;
grant update on public.clan_join_requests to authenticated;
grant delete on public.clan_join_requests to authenticated;
