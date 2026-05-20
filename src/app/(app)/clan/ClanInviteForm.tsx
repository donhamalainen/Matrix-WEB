"use client";

import { useState, useTransition } from "react";
import { inviteToClan } from "./actions";

export default function ClanInviteForm() {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!nickname.trim()) return;

    startTransition(async () => {
      const res = await inviteToClan(nickname);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(`Kutsu lähetetty @${res.nickname}!`);
        setNickname("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="font-bold">Kutsu pelaaja</h2>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nimimerkki..."
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400"
        />
        <button
          type="submit"
          disabled={pending || !nickname.trim()}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          {pending ? "..." : "Kutsu"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
      {success && (
        <p className="text-sm text-teal-600 dark:text-teal-400">{success}</p>
      )}
    </form>
  );
}
