"use client";

import { useTransition } from "react";
import { acceptInvite, declineInvite } from "./actions";

type Invite = {
  id: string;
  clan_name: string;
  clan_tag: string;
  invited_by_nickname: string;
};

export default function ClanInviteList({ invites }: { invites: Invite[] }) {
  if (invites.length === 0) return null;

  return (
    <section className="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-5">
      <h2 className="font-bold mb-3">Kutsut ({invites.length})</h2>
      <ul className="flex flex-col gap-3">
        {invites.map((inv) => (
          <InviteCard key={inv.id} invite={inv} />
        ))}
      </ul>
    </section>
  );
}

function InviteCard({ invite }: { invite: Invite }) {
  const [pending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const res = await acceptInvite(invite.id);
      if (res?.error) alert(res.error);
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const res = await declineInvite(invite.id);
      if (res?.error) alert(res.error);
    });
  }

  return (
    <li className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div>
        <p className="font-medium">
          [{invite.clan_tag}] {invite.clan_name}
        </p>
        <p className="text-xs text-zinc-500">
          Kutsuja: @{invite.invited_by_nickname}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={pending}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          {pending ? "..." : "Hyväksy"}
        </button>
        <button
          onClick={handleDecline}
          disabled={pending}
          className="text-xs text-rose-500 hover:text-rose-700 disabled:opacity-50 font-semibold px-3 py-1.5"
        >
          Hylkää
        </button>
      </div>
    </li>
  );
}
