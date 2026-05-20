"use client";

import { useState, useTransition } from "react";
import { joinClan } from "./actions";

export default function ClanJoinButton({
  clanId,
  isOpen,
}: {
  clanId: string;
  isOpen: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleJoin() {
    setMessage(null);
    startTransition(async () => {
      const res = await joinClan(clanId);
      if (res?.error) {
        alert(res.error);
      } else if (res && !res.joined) {
        setMessage(res.message ?? "Pyyntö lähetetty!");
      }
    });
  }

  if (message) {
    return <span className="text-xs text-teal-500 font-medium">{message}</span>;
  }

  return (
    <button
      onClick={handleJoin}
      disabled={pending}
      className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
    >
      {pending ? "..." : isOpen ? "Liity" : "Pyydä liittyä"}
    </button>
  );
}
