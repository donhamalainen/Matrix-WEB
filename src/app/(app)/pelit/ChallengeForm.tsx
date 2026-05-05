"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { sendChallenge } from "./actions";
import { SPORTS, SPORT_BADGE, type Sport } from "@/lib/sports";

type Player = { id: string; nickname: string };

/**
 * Lomake haasteen lähettämiseen toiselle pelaajalle.
 * Hakukenttä pelaajan nimimerkin etsimiseen + lajivalinta.
 */
export default function ChallengeForm({ players }: { players: Player[] }) {
  const [opponent, setOpponent] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState<Sport>("football");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sulje dropdown kun klikataan ulkopuolelle.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Suodata pelaajat haun perusteella.
  const filtered = query.trim()
    ? players.filter((p) =>
        p.nickname.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : players;

  const selectedPlayer = players.find((p) => p.id === opponent);

  function selectPlayer(p: Player) {
    setOpponent(p.id);
    setQuery(p.nickname);
    setOpen(false);
  }

  function submit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await sendChallenge(formData);
      if (res?.error) setError(res.error);
      else {
        setSuccess(true);
        setOpponent("");
        setQuery("");
      }
    });
  }

  if (players.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Ei vielä muita pelaajia joita haastaa.
      </p>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
      {/* Vastustajan haku */}
      <label className="text-sm font-medium">Vastustaja</label>
      <div ref={wrapperRef} className="relative">
        <input type="hidden" name="opponent_id" value={opponent} />
        <input
          type="text"
          placeholder="Hae nimimerkillä..."
          autoComplete="off"
          value={
            open
              ? query
              : selectedPlayer
                ? `@${selectedPlayer.nickname}`
                : query
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpponent("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-3 text-base outline-none focus:ring-2 focus:ring-violet-400"
        />

        {/* Valittu pelaaja -badge */}
        {selectedPlayer && !open && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpponent("");
              setOpen(true);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-lg"
            aria-label="Tyhjennä"
          >
            ×
          </button>
        )}

        {/* Pelaajadropdown */}
        {open && (
          <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-zinc-400 italic">
                Ei tuloksia
              </li>
            ) : (
              filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectPlayer(p)}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 flex items-center gap-2 ${
                      opponent === p.id
                        ? "bg-violet-50 dark:bg-violet-900/20 font-semibold"
                        : ""
                    }`}
                  >
                    <span className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300">
                      {p.nickname[0]?.toUpperCase()}
                    </span>
                    <span>@{p.nickname}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Lajin valinta */}
      <label className="text-sm font-medium">Laji</label>
      <div className="flex gap-2">
        {SPORTS.map((s) => (
          <button
            type="button"
            key={s.value}
            onClick={() => setSport(s.value)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
              sport === s.value
                ? SPORT_BADGE[s.value]
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="sport" value={sport} />

      <button
        type="submit"
        disabled={pending || !opponent}
        className="rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-semibold py-3 disabled:opacity-60"
      >
        {pending ? "Lähetetään..." : "⚔️ Haasta"}
      </button>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && <p className="text-sm text-teal-600">Haaste lähetetty! 🎉</p>}
    </form>
  );
}
