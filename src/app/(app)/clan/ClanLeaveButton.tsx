"use client";

import { useTransition } from "react";
import { leaveClan } from "./actions";

export default function ClanLeaveButton({ isOwner }: { isOwner: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleLeave() {
    const msg = isOwner
      ? "Olet omistaja. Clan poistetaan kokonaan. Haluatko jatkaa?"
      : "Haluatko varmasti poistua clanista?";
    if (!confirm(msg)) return;

    startTransition(async () => {
      const res = await leaveClan();
      if (res?.error) alert(res.error);
    });
  }

  return (
    <button
      onClick={handleLeave}
      disabled={pending}
      className="w-full py-3 text-sm font-semibold text-rose-600 dark:text-rose-400 rounded-xl ring-1 ring-rose-200 dark:ring-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
    >
      {pending ? "..." : isOwner ? "Poista clan" : "Poistu clanista"}
    </button>
  );
}
