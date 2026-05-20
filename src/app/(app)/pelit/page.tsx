import { getProfile } from "@/lib/auth";
import ChallengeForm from "./ChallengeForm";

export const dynamic = "force-dynamic";

/**
 * Pelit-näkymä — pääsivu.
 * Näyttää muut pelaajat ja sallii haasteen lähettämisen.
 * Yksinkertaistettu yksilöpohjainen flow: ei tiimejä.
 */
export default async function PelitPage() {
  const { supabase, user } = await getProfile();

  // Hae kaikki muut rekisteröityneet pelaajat.
  const { data: otherPlayers } = await supabase
    .from("users")
    .select("id, nickname")
    .neq("id", user.id)
    .order("nickname");

  // Hae oma pelitilasto (kaikki pelit joissa olen osapuolena tai tiimiläisenä).
  const { data: teamGameRows } = await supabase
    .from("game_players")
    .select("game_id")
    .eq("user_id", user.id);
  const teamGameIds = (teamGameRows ?? []).map((r) => r.game_id as string);

  const statsOrFilter = teamGameIds.length
    ? `challenger_id.eq.${user.id},opponent_id.eq.${user.id},id.in.(${teamGameIds.join(",")})`
    : `challenger_id.eq.${user.id},opponent_id.eq.${user.id}`;

  const { data: myGames } = await supabase
    .from("games")
    .select("id, status")
    .or(statsOrFilter);

  const total = myGames?.length ?? 0;
  const pending = myGames?.filter((g) => g.status === "pending").length ?? 0;
  const active = myGames?.filter((g) => g.status === "accepted").length ?? 0;
  const completed =
    myGames?.filter((g) => g.status === "completed").length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Pelit 🎮</h1>

      {/* Yhteenveto */}
      <section className="grid grid-cols-3 gap-2">
        <StatCard label="Yhteensä" value={total} />
        <StatCard
          label="Käynnissä"
          value={pending + active}
          color="text-amber-600"
        />
        <StatCard label="Pelattu" value={completed} color="text-teal-600" />
      </section>

      {/* Haastelomake */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-5">
        <h2 className="font-bold mb-3">Haasta pelaaja</h2>
        <ChallengeForm players={otherPlayers ?? []} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-4 text-center">
      <p className={`text-2xl font-bold ${color ?? ""}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
