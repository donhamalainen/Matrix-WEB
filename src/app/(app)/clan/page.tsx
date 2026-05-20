import { getProfile } from "@/lib/auth";
import Link from "next/link";
import ClanJoinButton from "./ClanJoinButton";
import ClanLeaveButton from "./ClanLeaveButton";
import ClanKickButton from "./ClanKickButton";
import ClanInviteForm from "./ClanInviteForm";
import ClanInviteList from "./ClanInviteList";
import ClanJoinRequests from "./ClanJoinRequests";
import ClanOpenToggle from "./ClanOpenToggle";

export const dynamic = "force-dynamic";

type ClanRow = {
  id: string;
  name: string;
  tag: string;
  description: string;
  owner_id: string;
  created_at: string;
};

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: { id: string; nickname: string } | null;
};

export default async function ClanPage() {
  const { supabase, user } = await getProfile();

  // Hae käyttäjän oma jäsenyys.
  const { data: myMembership } = await supabase
    .from("clan_members")
    .select("id, clan_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  // Jos käyttäjä on clanissa → näytä oman clanin sivu.
  if (myMembership) {
    const { data: clan } = await supabase
      .from("clans")
      .select("*")
      .eq("id", myMembership.clan_id)
      .single();

    const { data: members } = await supabase
      .from("clan_members")
      .select(
        "id, user_id, role, joined_at, user:users!clan_members_user_id_fkey(id, nickname)",
      )
      .eq("clan_id", myMembership.clan_id)
      .order("joined_at");

    const clanData = clan as ClanRow;
    const memberRows = (members ?? []) as unknown as MemberRow[];
    const isOwner = myMembership.role === "owner";
    const isAdmin = myMembership.role === "admin";

    // Hae liittymispyynnöt (vain omistaja/admin näkee).
    let joinRequests: { id: string; nickname: string }[] = [];
    if (isOwner || isAdmin) {
      const { data: rawRequests } = await supabase
        .from("clan_join_requests")
        .select(
          "id, user_id, user:users!clan_join_requests_user_id_fkey(nickname)",
        )
        .eq("clan_id", myMembership.clan_id)
        .eq("status", "pending");

      joinRequests = (rawRequests ?? []).map((r: any) => ({
        id: r.id,
        nickname: r.user?.nickname ?? "?",
      }));
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            [{clanData.tag}] {clanData.name}
          </h1>
          {isOwner && (
            <ClanOpenToggle isOpen={(clanData as any).open ?? true} />
          )}
        </div>

        {clanData.description && (
          <p className="text-sm text-zinc-500">{clanData.description}</p>
        )}

        {/* Liittymispyynnöt — vain omistaja/admin */}
        {(isOwner || isAdmin) && <ClanJoinRequests requests={joinRequests} />}

        <section className="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-5">
          <h2 className="font-bold mb-3">Jäsenet ({memberRows.length})</h2>
          <ul className="flex flex-col gap-2">
            {memberRows.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    @{m.user?.nickname ?? "?"}
                  </span>
                  {m.role === "owner" && (
                    <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-1.5 py-0.5 rounded">
                      Omistaja
                    </span>
                  )}
                  {m.role === "admin" && (
                    <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
                {isOwner && m.user_id !== user.id && (
                  <ClanKickButton
                    memberId={m.id}
                    nickname={m.user?.nickname ?? "?"}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Kutsu pelaaja — vain omistaja/admin */}
        {(isOwner || isAdmin) && (
          <section className="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-5">
            <ClanInviteForm />
          </section>
        )}

        <ClanLeaveButton isOwner={isOwner} />
      </div>
    );
  }

  // Käyttäjä ei ole clanissa → näytä lista claneista + luo uusi.
  // Hae ensin omat pending-kutsut.
  const { data: rawInvites } = await supabase
    .from("clan_invites")
    .select(
      "id, clan_id, invited_by, status, clan:clans!clan_invites_clan_id_fkey(name, tag), inviter:users!clan_invites_invited_by_fkey(nickname)",
    )
    .eq("invited_user_id", user.id)
    .eq("status", "pending");

  const pendingInvites = (rawInvites ?? []).map((inv: any) => ({
    id: inv.id,
    clan_name: inv.clan?.name ?? "?",
    clan_tag: inv.clan?.tag ?? "?",
    invited_by_nickname: inv.inviter?.nickname ?? "?",
  }));

  const { data: allClans } = await supabase
    .from("clans")
    .select("id, name, tag, description, open, created_at")
    .order("created_at", { ascending: false });

  const clanList = (allClans ?? []) as (ClanRow & { open: boolean })[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clanit 🛡️</h1>
        <Link
          href="/clan/luo"
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Luo Clan
        </Link>
      </div>

      {/* Omat kutsut */}
      <ClanInviteList invites={pendingInvites} />

      {clanList.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">
          Ei vielä claneja. Luo ensimmäinen!
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {clanList.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold">
                    [{c.tag}] {c.name}
                  </p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.open ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"}`}
                  >
                    {c.open ? "Avoin" : "Suljettu"}
                  </span>
                </div>
                {c.description && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {c.description}
                  </p>
                )}
              </div>
              <ClanJoinButton clanId={c.id} isOpen={c.open} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
