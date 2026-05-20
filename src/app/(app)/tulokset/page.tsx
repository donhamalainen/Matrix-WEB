import Link from "next/link";
import { getProfile } from "@/lib/auth";
import {
  SPORT_BADGE,
  SPORT_EMOJI,
  SPORT_LABEL,
  type Sport,
} from "@/lib/sports";
import SportFilter from "@/components/SportFilter";
import ResultForm from "./ResultForm";

export const dynamic = "force-dynamic";

type GameWithResult = {
  id: string;
  sport: Sport;
  status: "pending" | "accepted" | "declined" | "completed";
  challenger_id: string;
  opponent_id: string;
  scheduled_at: string | null;
  challenger: { id: string; nickname: string } | null;
  opponent: { id: string; nickname: string } | null;
  // game_id on UNIQUE → PostgREST palauttaa yksittäisen objektin, ei taulukkoa.
  results: {
    score_challenger: number;
    score_opponent: number;
    confirmed_by_challenger: boolean;
    confirmed_by_opponent: boolean;
    played_at: string;
  } | null;
};

/**
 * Tulokset-näkymä — yksilöpohjainen.
 * Yhteenveto + tuloskirjaus + otteluhistoria.
 */
export default async function TuloksetPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; game?: string }>;
}) {
  const sp = await searchParams;
  const sportFilter = (sp.sport as Sport | undefined) ?? null;

  const { supabase, user } = await getProfile();

  // Hae pelit joissa olen mukana joko kapteenina tai tiimipelaajana.
  const { data: teamGameRows } = await supabase
    .from("game_players")
    .select("game_id")
    .eq("user_id", user.id);
  const teamGameIds = (teamGameRows ?? []).map((r) => r.game_id as string);

  const orFilter = teamGameIds.length
    ? `challenger_id.eq.${user.id},opponent_id.eq.${user.id},id.in.(${teamGameIds.join(",")})`
    : `challenger_id.eq.${user.id},opponent_id.eq.${user.id}`;

  let q = supabase
    .from("games")
    .select(
      `id, sport, status, scheduled_at, challenger_id, opponent_id,
       challenger:users!games_challenger_id_fkey(id, nickname),
       opponent:users!games_opponent_id_fkey(id, nickname),
       results(score_challenger, score_opponent, confirmed_by_challenger, confirmed_by_opponent, played_at)`,
    )
    .or(orFilter)
    .in("status", ["accepted", "completed"])
    .order("created_at", { ascending: false });

  if (sportFilter) q = q.eq("sport", sportFilter);

  const { data } = await q;
  const rows = (data ?? []) as unknown as GameWithResult[];

  // Hae tiimiroolit (home/away) tiimipeleille jotta yhteenveto on oikein.
  const gameIds = rows.map((g) => g.id);
  let myTeamByGame: Record<string, "home" | "away"> = {};
  if (gameIds.length) {
    const { data: myPlayerRows } = await supabase
      .from("game_players")
      .select("game_id, team")
      .eq("user_id", user.id)
      .in("game_id", gameIds);
    for (const row of myPlayerRows ?? []) {
      myTeamByGame[row.game_id as string] = row.team as "home" | "away";
    }
  }

  // Laske yhteenveto vain molemmin puolin vahvistetuista.
  let wins = 0,
    losses = 0,
    draws = 0;
  for (const g of rows) {
    const r = g.results;
    if (!r?.confirmed_by_challenger || !r?.confirmed_by_opponent) continue;

    // Päätä oma tiimi: game_players > fallback kapteenilogiikka.
    const myTeam = myTeamByGame[g.id];
    let myScore: number, theirScore: number;
    if (myTeam) {
      myScore = myTeam === "home" ? r.score_challenger : r.score_opponent;
      theirScore = myTeam === "home" ? r.score_opponent : r.score_challenger;
    } else {
      // Fallback vanhoille peleille ilman game_players-rivejä.
      const iAmChallenger = g.challenger_id === user.id;
      myScore = iAmChallenger ? r.score_challenger : r.score_opponent;
      theirScore = iAmChallenger ? r.score_opponent : r.score_challenger;
    }

    if (myScore > theirScore) wins++;
    else if (myScore < theirScore) losses++;
    else draws++;
  }
  const played = wins + losses + draws;

  const focusId = sp.game ?? null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Tulokset</h1>

      {/* Yhteenveto */}
      <section className="grid grid-cols-4 gap-2">
        <Stat label="Pelatut" value={played} />
        <Stat label="V" value={wins} color="text-teal-600" />
        <Stat label="T" value={draws} color="text-zinc-500" />
        <Stat label="H" value={losses} color="text-rose-500" />
      </section>

      <SportFilter />

      <div className="flex flex-col gap-3">
        {rows.length === 0 && (
          <p className="text-sm text-zinc-500 italic">Ei vielä otteluita.</p>
        )}
        {rows.map((g) => {
          const r = g.results ?? null;
          const iAmChallenger = g.challenger_id === user.id;
          const iAmOpponent = g.opponent_id === user.id;
          const iAmCaptain = iAmChallenger || iAmOpponent;
          const isCompleted = g.status === "completed";

          // Tiimiläiset eivät voi vahvistaa — vain kapteenit.
          const myConfirmed = iAmChallenger
            ? r?.confirmed_by_challenger
            : iAmOpponent
              ? r?.confirmed_by_opponent
              : true; // tiimiläinen ei vahvista
          const pendingMyConfirm = !!(
            iAmCaptain &&
            r &&
            !myConfirmed &&
            !isCompleted
          );
          const iWaitingForOther = !!(
            iAmCaptain &&
            r &&
            myConfirmed &&
            !isCompleted
          );
          const expanded =
            iAmCaptain &&
            (focusId === g.id ||
              (!isCompleted && !r) ||
              pendingMyConfirm ||
              iWaitingForOther);

          return (
            <article
              key={g.id}
              className="rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SPORT_BADGE[g.sport]}`}
                >
                  {SPORT_EMOJI[g.sport]} {SPORT_LABEL[g.sport]}
                </span>
                {isCompleted ? (
                  <span className="text-xs font-semibold text-teal-600">
                    Vahvistettu ✓
                  </span>
                ) : r ? (
                  <span className="text-xs font-semibold text-amber-500">
                    Odottaa vahvistusta
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-zinc-500">
                    Odottaa kirjausta
                  </span>
                )}
              </div>

              <p className="text-sm text-zinc-500 mb-2">
                <span className="font-semibold text-foreground">
                  @{g.challenger?.nickname}
                </span>{" "}
                vs{" "}
                <span className="font-semibold text-foreground">
                  @{g.opponent?.nickname}
                </span>
              </p>

              {isCompleted && r ? (
                <div className="text-3xl font-bold text-center py-2">
                  {r.score_challenger} <span className="text-zinc-400">–</span>{" "}
                  {r.score_opponent}
                </div>
              ) : isCompleted ? (
                <p className="text-sm text-zinc-500 italic text-center py-2">
                  Tulos kirjattu ✓
                </p>
              ) : expanded ? (
                <ResultForm
                  gameId={g.id}
                  challengerName={g.challenger?.nickname ?? "Haastaja"}
                  opponentName={g.opponent?.nickname ?? "Vastustaja"}
                  iAmChallenger={iAmChallenger}
                  existing={r}
                />
              ) : !iAmCaptain ? (
                <p className="text-sm text-zinc-500 italic text-center py-2">
                  Kapteeni kirjaa tuloksen
                </p>
              ) : (
                <Link
                  href={`/tulokset?game=${g.id}${
                    sportFilter ? `&sport=${sportFilter}` : ""
                  }`}
                  className="block text-center text-sm font-semibold text-violet-600 underline mt-2"
                >
                  Kirjaa tulos →
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-3 text-center">
      <p className={`text-xl font-bold ${color ?? ""}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
