import { createClient } from "@/lib/supabase/server";
import {
  SPORT_BADGE,
  SPORT_EMOJI,
  SPORT_LABEL,
  type Sport,
} from "@/lib/sports";
import SportFilter from "@/components/SportFilter";

export const dynamic = "force-dynamic";

type Row = {
  user_id: string;
  nickname: string;
  sport: Sport;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
};

/**
 * Ranking-näkymä — yksilöpohjainen leaderboard.
 * Ilman lajisuodatinta summataan kaikki lajit yhteen per pelaaja.
 */
export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const sp = await searchParams;
  const sportFilter = (sp.sport as Sport | undefined) ?? null;

  const supabase = await createClient();

  let q = supabase.from("leaderboard").select("*");
  if (sportFilter) q = q.eq("sport", sportFilter);

  const { data } = await q;
  const rows = (data ?? []) as Row[];

  // Aggregoi pelaajakohtaisesti kun ei lajisuodatinta.
  const aggregated: Record<string, Row> = {};
  for (const r of rows) {
    const key = r.user_id;
    if (!aggregated[key]) {
      aggregated[key] = { ...r };
    } else {
      aggregated[key].games_played += r.games_played;
      aggregated[key].wins += r.wins;
      aggregated[key].draws += r.draws;
      aggregated[key].losses += r.losses;
      aggregated[key].points += r.points;
    }
  }
  const sorted = Object.values(aggregated).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.games_played - b.games_played;
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Ranking 🏆</h1>
      <p className="text-sm text-zinc-500 -mt-2">
        Voitto = 3p · Tasapeli = 1p · Tappio = 0p
      </p>

      <SportFilter />

      {sorted.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">
          Ei vielä vahvistettuja tuloksia.
        </p>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Pelaaja</th>
                <th className="text-center p-3">P</th>
                <th className="text-center p-3">V</th>
                <th className="text-center p-3">T</th>
                <th className="text-center p-3">H</th>
                <th className="text-right p-3 pr-4">PTS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.user_id}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="p-3 font-bold">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="p-3 font-semibold">@{r.nickname}</td>
                  <td className="text-center p-3">{r.games_played}</td>
                  <td className="text-center p-3 text-teal-600">{r.wins}</td>
                  <td className="text-center p-3">{r.draws}</td>
                  <td className="text-center p-3 text-rose-500">{r.losses}</td>
                  <td className="text-right p-3 pr-4 font-bold">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
