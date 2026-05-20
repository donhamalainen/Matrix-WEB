"use client";

import { useTransition } from "react";
import { kickMember } from "./actions";

export default function ClanKickButton({
  memberId,
  nickname,
}: {
  memberId: string;
  nickname: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleKick() {
    if (!confirm(`Poista @${nickname} clanista?`)) return;
    startTransition(async () => {
      const res = await kickMember(memberId);
      if (res?.error) alert(res.error);
    });
  }

  return (
    <button
      onClick={handleKick}
      disabled={pending}
      className="text-xs text-rose-500 hover:text-rose-700 disabled:opacity-50"
    >
      {pending ? "..." : "Poista"}
    </button>
  );
}
