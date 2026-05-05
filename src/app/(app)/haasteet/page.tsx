import Link from "next/link";
import { getProfile } from "@/lib/auth";
import {
  SPORT_BADGE,
  SPORT_EMOJI,
  SPORT_LABEL,
  type Sport,
} from "@/lib/sports";
import RespondButtons from "./RespondButtons";
import SportFilter from "@/components/SportFilter";

export const dynamic = "force-dynamic";

type GameRow = {
  id: string;
  sport: Sport;
  status: "pending" | "accepted" | "declined" | "completed";
  scheduled_at: string | null;
  created_at: string;
  challenger_id: string;
  opponent_id: string;
  challenger: { id: string; nickname: string } | null;
  opponent: { id: string; nickname: string } | null;
};

const STATUS_LABEL: Record<GameRow["status"], string> = {
  pending: "Odottaa",
  accepted: "Hyväksytty",
  declined: "Hylätty",
  completed: "Pelattu",
};

const STATUS_BADGE: Record<GameRow["status"], string> = {
  pending: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  accepted:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  declined: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  completed: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

/**
 * Haasteet-näkymä — näyttää saapuneet, lähetetyt ja historian.
 * Yksilöpohjainen: haastaja vs vastustaja.
 */
export default async function HaasteetPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const sp = await searchParams;
  const sportFilter = (sp.sport as Sport | undefined) ?? null;

  const { supabase, user } = await getProfile();

  let q = supabase
    .from("games")
    .select(
      `id, sport, status, scheduled_at, created_at,
       challenger_id, opponent_id,
       challenger:users!games_challenger_id_fkey(id, nickname),
       opponent:users!games_opponent_id_fkey(id, nickname)`,
    )
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (sportFilter) q = q.eq("sport", sportFilter);

  const { data: games } = await q;
  const rows = (games ?? []) as unknown as GameRow[];

  const incoming = rows.filter(
    (g) => g.opponent_id === user.id && g.status === "pending",
  );
  const sent = rows.filter(
    (g) => g.challenger_id === user.id && g.status === "pending",
  );
  const other = rows.filter((g) => g.status !== "pending");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Haasteet</h1>
      <SportFilter />

      <Section title={`Saapuneet (${incoming.length})`}>
        {incoming.length === 0 ? (
          <Empty text="Ei uusia haasteita." />
        ) : (
          incoming.map((g) => (
            <GameCard key={g.id} g={g} myId={user.id}>
              <RespondButtons challengeId={g.id} />
            </GameCard>
          ))
        )}
      </Section>

      <Section title={`Lähetetyt (${sent.length})`}>
        {sent.length === 0 ? (
          <Empty text="Ei lähetettyjä haasteita." />
        ) : (
          sent.map((g) => <GameCard key={g.id} g={g} myId={user.id} />)
        )}
      </Section>

      <Section title="Historia">
        {other.length === 0 ? (
          <Empty text="Ei vielä päättyneitä haasteita." />
        ) : (
          other.map((g) => <GameCard key={g.id} g={g} myId={user.id} />)
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-2">
        {title}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-zinc-400 italic px-2 py-3">{text}</p>;
}

function GameCard({
  g,
  myId,
  children,
}: {
  g: GameRow;
  myId: string;
  children?: React.ReactNode;
}) {
  const other = g.challenger_id === myId ? g.opponent : g.challenger;
  const direction = g.challenger_id === myId ? "Sinä vs" : "haastaa sinut";

  return (
    <article className="rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SPORT_BADGE[g.sport]}`}
        >
          {SPORT_EMOJI[g.sport]} {SPORT_LABEL[g.sport]}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[g.status]}`}
        >
          {STATUS_LABEL[g.status]}
        </span>
      </div>

      <p className="mt-2 text-base">
        <span className="text-zinc-500 text-sm">{direction} </span>
        <span className="font-bold">@{other?.nickname ?? "—"}</span>
      </p>

      {g.scheduled_at && (
        <p className="text-xs text-zinc-500 mt-1">
          🕐 {new Date(g.scheduled_at).toLocaleString("fi-FI")}
        </p>
      )}

      {g.status === "accepted" && (
        <Link
          href={`/tulokset?game=${g.id}`}
          className="mt-3 block text-center rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm py-2 font-semibold"
        >
          Kirjaa tulos →
        </Link>
      )}

      {children}
    </article>
  );
}
