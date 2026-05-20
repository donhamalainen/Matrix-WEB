"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClan } from "../actions";

export default function CreateClanForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createClan(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        router.push("/clan");
      }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium" htmlFor="name">
          Nimi
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={30}
          placeholder="Esim. Helsinki Hooligans"
          className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="tag">
          Tagi (2–6 merkkiä)
        </label>
        <input
          id="tag"
          name="tag"
          type="text"
          required
          minLength={2}
          maxLength={6}
          placeholder="Esim. HH"
          className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="description">
          Kuvaus (valinnainen)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={200}
          placeholder="Lyhyt kuvaus clanista..."
          className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="open"
          name="open"
          type="checkbox"
          defaultChecked={true}
          className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-violet-600 focus:ring-violet-500"
        />
        <label className="text-sm font-medium" htmlFor="open">
          Avoin clan (kuka tahansa voi liittyä)
        </label>
      </div>

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {pending ? "Luodaan..." : "Luo Clan"}
      </button>
    </form>
  );
}
