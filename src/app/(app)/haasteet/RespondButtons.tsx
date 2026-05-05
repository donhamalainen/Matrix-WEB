"use client";

import { useTransition, useState } from "react";
import { respondChallenge } from "./actions";

/** Hyväksy/hylkää-painikkeet vastaanotetulle haasteelle. */
export default function RespondButtons({
  challengeId,
}: {
  challengeId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await respondChallenge(challengeId, accept);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => handle(false)}
        disabled={pending}
        className="flex-1 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold disabled:opacity-60"
      >
        Hylkää
      </button>
      <button
        onClick={() => handle(true)}
        disabled={pending}
        className="flex-1 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold disabled:opacity-60"
      >
        Hyväksy
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
