"use client";

import { useState, useTransition } from "react";
import { recordResult } from "./actions";

/**
 * Tuloksen kirjaaminen / vahvistaminen.
 *
 * Flow:
 * 1. Ei tulosta → lomake pisteiden syöttöön (ensimmäinen kirjaaja).
 * 2. Toisen ehdotus olemassa, minä en ole vahvistanut → Hyväksy / Hylkää.
 *    Hylkäys = vastatarjous (uudet pisteet), joka odottaa toisen hyväksyntää.
 * 3. Oma ehdotus olemassa, vastapuoli ei vahvistanut → "Odottaa vahvistusta".
 * 4. Molemmat vahvistaneet → lukittu.
 */
export default function ResultForm({
  gameId,
  challengerName,
  opponentName,
  iAmChallenger,
  existing,
}: {
  gameId: string;
  challengerName: string;
  opponentName: string;
  iAmChallenger: boolean;
  existing: {
    score_challenger: number;
    score_opponent: number;
    confirmed_by_challenger: boolean;
    confirmed_by_opponent: boolean;
  } | null;
}) {
  const [mode, setMode] = useState<"view" | "counter">("view");
  const [scoreChallenger, setScoreChallenger] = useState(
    existing?.score_challenger?.toString() ?? "",
  );
  const [scoreOpponent, setScoreOpponent] = useState(
    existing?.score_opponent?.toString() ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const myConfirmed = iAmChallenger
    ? existing?.confirmed_by_challenger
    : existing?.confirmed_by_opponent;
  const otherConfirmed = iAmChallenger
    ? existing?.confirmed_by_opponent
    : existing?.confirmed_by_challenger;

  const locked = !!(myConfirmed && otherConfirmed);
  const pendingApproval = !!(existing && otherConfirmed && !myConfirmed);
  const waitingForOther = !!(existing && myConfirmed && !otherConfirmed);

  function submitAccept() {
    setError(null);
    setSuccess(false);
    const fd = new FormData();
    fd.set("game_id", gameId);
    fd.set("score_challenger", String(existing!.score_challenger));
    fd.set("score_opponent", String(existing!.score_opponent));
    startTransition(async () => {
      const res = await recordResult(fd);
      if (res?.error) setError(res.error);
      else setSuccess(true);
    });
  }

  function submitCounter(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await recordResult(formData);
      if (res?.error) setError(res.error);
      else {
        setSuccess(true);
        setMode("view");
      }
    });
  }

  function submitFirst(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await recordResult(formData);
      if (res?.error) setError(res.error);
      else setSuccess(true);
    });
  }

  // --- LUKITTU ---
  if (locked && existing) {
    return (
      <div className="flex flex-col gap-3">
        <ScoreDisplay
          challengerName={challengerName}
          opponentName={opponentName}
          scoreChallenger={existing.score_challenger}
          scoreOpponent={existing.score_opponent}
        />
        <div className="text-xs text-teal-600 flex items-center gap-1.5 justify-center font-semibold">
          <span>🔒</span> Tulos vahvistettu — ei voi enää muuttaa
        </div>
      </div>
    );
  }

  // --- ODOTTAA TOISEN VAHVISTUSTA ---
  if (waitingForOther && existing) {
    return (
      <div className="flex flex-col gap-3">
        <ScoreDisplay
          challengerName={challengerName}
          opponentName={opponentName}
          scoreChallenger={existing.score_challenger}
          scoreOpponent={existing.score_opponent}
        />
        <div className="text-xs text-amber-600 flex items-center gap-1.5 justify-center font-semibold">
          <span>⏳</span> Odottaa vastapuolen vahvistusta
        </div>
      </div>
    );
  }

  // --- TOISEN EHDOTUS → Hyväksy / Hylkää ---
  if (pendingApproval && existing && mode === "view") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-zinc-500 text-center">
          Vastapuoli ehdottaa tulosta:
        </p>
        <ScoreDisplay
          challengerName={challengerName}
          opponentName={opponentName}
          scoreChallenger={existing.score_challenger}
          scoreOpponent={existing.score_opponent}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("counter")}
            disabled={pending}
            className="flex-1 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold disabled:opacity-60"
          >
            Hylkää
          </button>
          <button
            type="button"
            onClick={submitAccept}
            disabled={pending}
            className="flex-1 py-3 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold disabled:opacity-60"
          >
            {pending ? "..." : "✓ Hyväksy"}
          </button>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {success && (
          <p className="text-sm text-teal-600">Tulos vahvistettu!</p>
        )}
      </div>
    );
  }

  // --- VASTATARJOUS (hylkäys → syötä omat pisteet) ---
  if (mode === "counter" && existing) {
    return (
      <form action={submitCounter} className="flex flex-col gap-3">
        <input type="hidden" name="game_id" value={gameId} />
        <p className="text-xs text-zinc-500 text-center">
          Syötä oma ehdotuksesi tuloksesta:
        </p>
        <ScoreInputs
          challengerName={challengerName}
          opponentName={opponentName}
          scoreChallenger={scoreChallenger}
          scoreOpponent={scoreOpponent}
          setScoreChallenger={setScoreChallenger}
          setScoreOpponent={setScoreOpponent}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("view")}
            className="flex-1 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold"
          >
            Peru
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 py-3 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-semibold disabled:opacity-60"
          >
            {pending ? "..." : "Lähetä vastatarjous"}
          </button>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>
    );
  }

  // --- ENSIMMÄINEN KIRJAUS ---
  return (
    <form action={submitFirst} className="flex flex-col gap-3">
      <input type="hidden" name="game_id" value={gameId} />
      <ScoreInputs
        challengerName={challengerName}
        opponentName={opponentName}
        scoreChallenger={scoreChallenger}
        scoreOpponent={scoreOpponent}
        setScoreChallenger={setScoreChallenger}
        setScoreOpponent={setScoreOpponent}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-semibold py-3 disabled:opacity-60"
      >
        {pending ? "Tallennetaan..." : "Kirjaa tulos"}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && (
        <p className="text-sm text-teal-600">
          Lähetetty! Odottaa vastapuolen vahvistusta.
        </p>
      )}
    </form>
  );
}

// --- Apukomponentit ---

function ScoreDisplay({
  challengerName,
  opponentName,
  scoreChallenger,
  scoreOpponent,
}: {
  challengerName: string;
  opponentName: string;
  scoreChallenger: number;
  scoreOpponent: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 text-center">
        <p className="text-xs text-zinc-500 truncate">@{challengerName}</p>
        <p className="text-3xl font-bold py-3">{scoreChallenger}</p>
      </div>
      <span className="text-2xl font-bold text-zinc-400">–</span>
      <div className="flex-1 text-center">
        <p className="text-xs text-zinc-500 truncate">@{opponentName}</p>
        <p className="text-3xl font-bold py-3">{scoreOpponent}</p>
      </div>
    </div>
  );
}

function ScoreInputs({
  challengerName,
  opponentName,
  scoreChallenger,
  scoreOpponent,
  setScoreChallenger,
  setScoreOpponent,
}: {
  challengerName: string;
  opponentName: string;
  scoreChallenger: string;
  scoreOpponent: string;
  setScoreChallenger: (v: string) => void;
  setScoreOpponent: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 text-center">
        <p className="text-xs text-zinc-500 truncate">@{challengerName}</p>
        <input
          type="number"
          min={0}
          name="score_challenger"
          value={scoreChallenger}
          onChange={(e) => setScoreChallenger(e.target.value)}
          required
          className="w-full text-center text-3xl font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent py-3"
        />
      </div>
      <span className="text-2xl font-bold text-zinc-400">–</span>
      <div className="flex-1 text-center">
        <p className="text-xs text-zinc-500 truncate">@{opponentName}</p>
        <input
          type="number"
          min={0}
          name="score_opponent"
          value={scoreOpponent}
          onChange={(e) => setScoreOpponent(e.target.value)}
          required
          className="w-full text-center text-3xl font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent py-3"
        />
      </div>
    </div>
  );
}
