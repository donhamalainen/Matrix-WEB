"use client";

import { useTransition } from "react";
import { toggleClanOpen } from "./actions";

export default function ClanOpenToggle({ isOpen }: { isOpen: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleClanOpen();
      if (res?.error) alert(res.error);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
        isOpen
          ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-900/50"
          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
      } disabled:opacity-50`}
    >
      {pending ? "..." : isOpen ? "🔓 Avoin" : "🔒 Suljettu"}
    </button>
  );
}
