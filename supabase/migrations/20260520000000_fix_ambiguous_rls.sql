-- =============================================================
-- Fix: RLS-politiikkojen kvalifioimattomat `clan_id`-viittaukset
-- =============================================================
-- Aiemmissa politiikoissa käytettiin alikyselyä
--   EXISTS (SELECT 1 FROM clan_members cm WHERE cm.clan_id = clan_id ...)
-- jossa kvalifioimaton `clan_id` resolvoituu PostgreSQL:ssä alikyselyn
-- *sisemmän* taulun (cm) sarakkeeseen, eli ehdosta tulee `cm.clan_id =
-- cm.clan_id` — aina tosi. Tämä mahdollisti minkä tahansa clanin
-- omistajan/adminin operoida minkä tahansa toisen clanin kutsuja,
-- liittymispyyntöjä ja jäsenyyksiä. Korjataan kvalifioimalla viittaus
-- ulompaan tauluun.

-- ---------- CLAN_MEMBERS: insert ----------
drop policy if exists clan_members_insert on public.clan_members;

create policy clan_members_insert on public.clan_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.clan_members cm
      where cm.clan_id = public.clan_members.clan_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- ---------- CLAN_INVITES: insert ----------
drop policy if exists clan_invites_insert on public.clan_invites;

create policy clan_invites_insert on public.clan_invites for insert
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.clan_members cm
      where cm.clan_id = public.clan_invites.clan_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- ---------- CLAN_JOIN_REQUESTS: update + delete ----------
drop policy if exists clan_join_requests_update on public.clan_join_requests;

create policy clan_join_requests_update on public.clan_join_requests for update
  using (
    exists (
      select 1 from public.clan_members cm
      where cm.clan_id = public.clan_join_requests.clan_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

drop policy if exists clan_join_requests_delete on public.clan_join_requests;

create policy clan_join_requests_delete on public.clan_join_requests for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.clan_members cm
      where cm.clan_id = public.clan_join_requests.clan_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );
