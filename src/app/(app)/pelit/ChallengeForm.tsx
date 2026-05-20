"use client";

import { useState, useTransition, useEffect } from "react";
import { sendChallenge } from "./actions";
import { SPORTS, SPORT_BADGE, type Sport } from "@/lib/sports";

type Player = { id: string; nickname: string };

/**
 * Lomake haasteen lähettämiseen.
 * 1v1: valitse vastustaja.
 * 2v2+: valitse omat tiimiläiset + vastustajat.
 */
export default function ChallengeForm({ players }: { players: Player[] }) {
  const [sport, setSport] = useState<Sport>("football");
  const [teamSize, setTeamSize] = useState(1);
  const [homeTeam, setHomeTeam] = useState<string[]>([]); // omat tiimiläiset (ei sisällä itseäsi)
  const [awayTeam, setAwayTeam] = useState<string[]>([]); // vastustajat
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  // Resetoi tiimivalinnat kun team size muuttuu.
  useEffect(() => {
    setHomeTeam([]);
    setAwayTeam([]);
  }, [teamSize]);

  function togglePlayer(playerId: string, team: "home" | "away") {
    if (team === "home") {
      setHomeTeam((prev) =>
        prev.includes(playerId)
          ? prev.filter((id) => id !== playerId)
          : prev.length < teamSize - 1
            ? [...prev, playerId]
            : prev,
      );
      // Poista toisesta tiimistä jos valittu sinne.
      setAwayTeam((prev) => prev.filter((id) => id !== playerId));
    } else {
      setAwayTeam((prev) =>
        prev.includes(playerId)
          ? prev.filter((id) => id !== playerId)
          : prev.length < teamSize
            ? [...prev, playerId]
            : prev,
      );
      setHomeTeam((prev) => prev.filter((id) => id !== playerId));
    }
  }

  function submit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await sendChallenge(formData);
      if (res?.error) setError(res.error);
      else {
        setSuccess(true);
        setHomeTeam([]);
        setAwayTeam([]);
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

  // 1v1: away = 1 vastustaja, home = 0 (vain sinä itse)
  // 2v2: home = 1 tiimiläinen, away = 2 vastustajaa
  // 3v3: home = 2, away = 3 jne.
  const needHomeCount = teamSize - 1; // tiimiläisiä joita tarvitset (ei sinä itse)
  const needAwayCount = teamSize; // vastustajia

  const canSubmit =
    teamSize === 1
      ? awayTeam.length === 1
      : homeTeam.length === needHomeCount && awayTeam.length === needAwayCount;

  // Pelaajat jotka eivät ole vielä valittu kumpaankaan tiimiin.
  const availableForHome = players.filter(
    (p) => !awayTeam.includes(p.id) && !homeTeam.includes(p.id),
  );
  const availableForAway = players.filter(
    (p) => !homeTeam.includes(p.id) && !awayTeam.includes(p.id),
  );

  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="team_size" value={teamSize} />
      <input type="hidden" name="home_team" value={JSON.stringify(homeTeam)} />
      <input type="hidden" name="away_team" value={JSON.stringify(awayTeam)} />

      {/* Lajin valinta */}
      <label className="text-sm font-medium">Laji</label>
      <div className="grid grid-cols-4 gap-2">
        {SPORTS.map((s) => (
          <button
            type="button"
            key={s.value}
            onClick={() => setSport(s.value)}
            className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold transition-all ${
              sport === s.value
                ? SPORT_BADGE[s.value] + " scale-105 shadow-sm"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            <span className="text-xl">{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Pelimuoto / team size */}
      <label className="text-sm font-medium">Pelimuoto</label>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 5, 11].map((size) => (
          <button
            type="button"
            key={size}
            onClick={() => setTeamSize(size)}
            className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
              teamSize === size
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 scale-105 shadow-sm"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {size}v{size}
          </button>
        ))}
      </div>

      {/* Tiimivalinta */}
      {teamSize === 1 ? (
        /* 1v1: yksinkertainen vastustajan valinta */
        <PlayerPicker
          label="Vastustaja"
          players={players}
          selected={awayTeam}
          max={1}
          onToggle={(id) => {
            setAwayTeam((prev) => (prev.includes(id) ? [] : [id]));
          }}
        />
      ) : (
        <>
          {/* Oma tiimi */}
          {needHomeCount > 0 && (
            <PlayerPicker
              label={`Oma tiimi (valitse ${needHomeCount})`}
              players={availableForHome}
              allPlayers={players}
              selected={homeTeam}
              max={needHomeCount}
              onToggle={(id) => togglePlayer(id, "home")}
            />
          )}
          {/* Vastustajat */}
          <PlayerPicker
            label={`Vastustajat (valitse ${needAwayCount})`}
            players={availableForAway}
            allPlayers={players}
            selected={awayTeam}
            max={needAwayCount}
            onToggle={(id) => togglePlayer(id, "away")}
          />
        </>
      )}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-semibold py-3 disabled:opacity-60"
      >
        {pending ? "Lähetetään..." : "⚔️ Haasta"}
      </button>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && <p className="text-sm text-teal-600">Haaste lähetetty! 🎉</p>}
    </form>
  );
}

/** Pelaajien valintakomponentti hakutoiminnolla. */
function PlayerPicker({
  label,
  players,
  allPlayers,
  selected,
  max,
  onToggle,
}: {
  label: string;
  players: Player[];
  allPlayers?: Player[];
  selected: string[];
  max: number;
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? players.filter((p) =>
        p.nickname.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : players;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">
        {label} ({selected.length}/{max})
      </label>

      {/* Valitut pelaajat */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const p = (allPlayers ?? players).find((pl) => pl.id === id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => onToggle(id)}
                className="flex items-center gap-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold px-2.5 py-1 rounded-lg"
              >
                @{p?.nickname ?? "?"} <span className="opacity-50">×</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Haku */}
      {selected.length < max && (
        <>
          <input
            type="text"
            placeholder="Hae nimimerkillä..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400"
          />
          <ul className="max-h-36 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-400 italic">
                Ei tuloksia
              </li>
            ) : (
              filtered.slice(0, 20).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(p.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 ${
                      selected.includes(p.id)
                        ? "bg-violet-50 dark:bg-violet-900/20 font-semibold"
                        : ""
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300">
                      {p.nickname[0]?.toUpperCase()}
                    </span>
                    @{p.nickname}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}
