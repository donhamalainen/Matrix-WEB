"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Nimimerkin valinta -lomake. Luo public.users-rivin auth.uid()-id:llä.
 */
export default function NicknameForm({
  phone,
  email,
}: {
  phone: string | null;
  email: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      setError("Istunto vanhentunut, kirjaudu uudelleen.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("users").insert({
      id: uid,
      nickname: nickname.trim(),
      phone,
      email,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/pelit");
    router.refresh();
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
        disabled={loading || nickname.trim().length < 2}
        className="rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-60 text-white font-semibold py-3"
      >
        {loading ? "Tallennetaan..." : "Jatka"}
      </button>
      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </form>
  );
}
