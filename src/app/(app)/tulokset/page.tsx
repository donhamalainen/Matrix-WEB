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
import { RealtimeRefresh } from "@/components/RealtimeRefresh";

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
  results:
    | {
        score_challenger: number;
        score_opponent: number;
        confirmed_by_challenger: boolean;
        confirmed_by_opponent: boolean;
        played_at: string;
      }[]
    | null;
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

  let q = supabase
    .from("games")
    .select(
      `id, sport, status, scheduled_at, challenger_id, opponent_id,
       challenger:users!games_challenger_id_fkey(id, nickname),
       opponent:users!games_opponent_id_fkey(id, nickname),
       results(score_challenger, score_opponent, confirmed_by_challenger, confirmed_by_opponent, played_at)`,
    )
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .in("status", ["accepted", "completed"])
    .order("created_at", { ascending: false });

  if (sportFilter) q = q.eq("sport", sportFilter);

  const { data } = await q;
  const rows = (data ?? []) as unknown as GameWithResult[];

  // Laske yhteenveto vain molemmin puolin vahvistetuista.
  let wins = 0,
    losses = 0,
    draws = 0;
  for (const g of rows) {
    const r = g.results?.[0];
    if (!r?.confirmed_by_challenger || !r?.confirmed_by_opponent) continue;
    const iAmChallenger = g.challenger_id === user.id;
    const my = iAmChallenger ? r.score_challenger : r.score_opponent;
    const their = iAmChallenger ? r.score_opponent : r.score_challenger;
    if (my > their) wins++;
    else if (my < their) losses++;
    else draws++;
  }
  const played = wins + losses + draws;

  const focusId = sp.game ?? null;

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresh />
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
          const r = g.results?.[0] ?? null;
          const iAmChallenger = g.challenger_id === user.id;
          const isCompleted = g.status === "completed";
          const myConfirmed = iAmChallenger
            ? r?.confirmed_by_challenger
            : r?.confirmed_by_opponent;
          const pendingMyConfirm = !!(r && !myConfirmed && !isCompleted);
          const expanded =
            focusId === g.id || (!isCompleted && !r) || pendingMyConfirm;

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
              ) : expanded ? (
                <ResultForm
                  gameId={g.id}
                  challengerName={g.challenger?.nickname ?? "Haastaja"}
                  opponentName={g.opponent?.nickname ?? "Vastustaja"}
                  iAmChallenger={iAmChallenger}
                  existing={r}
                />
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
