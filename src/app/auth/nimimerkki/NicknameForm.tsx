"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProfile } from "./actions";

/**
 * Nimimerkin valinta -lomake.
 * Itse insert tehdään server actionissa createProfile(), joka lukee
 * phone/email turvallisesti auth.users:sta — emme luota client-syötteisiin.
 */
export default function NicknameForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const data = new FormData();
    data.set("nickname", nickname);
    startTransition(async () => {
      const res = await createProfile(data);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.replace("/pelit");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col gap-3"
    >
      <h1 className="text-2xl font-bold mb-1">Valitse nimimerkki</h1>
      <p className="text-sm text-zinc-500 mb-3">
        Tämä näkyy haasteissa ja leaderboardissa.
      </p>
      <input
        type="text"
        placeholder="esim. SuperPelaaja"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        required
        minLength={2}
        maxLength={20}
        className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-3 text-base outline-none focus:ring-2 focus:ring-violet-400"
      />
      <button
        type="submit"
        disabled={pending || nickname.trim().length < 2}
        className="rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-60 text-white font-semibold py-3"
      >
        {pending ? "Tallennetaan..." : "Jatka"}
      </button>
      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </form>
  );
}
