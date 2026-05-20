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
  team_size: number;
  scheduled_at: string | null;
  created_at: string;
  challenger_id: string;
  opponent_id: string;
  challenger: { id: string; nickname: string } | null;
  opponent: { id: string; nickname: string } | null;
};

type GamePlayer = {
  game_id: string;
  user_id: string;
  team: "home" | "away";
  user: { id: string; nickname: string } | null;
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

  // Hae pelit joissa olen mukana joko kapteenina (challenger/opponent) tai
  // tiimipelaajana (game_players). Tiimipelaajat näkevät pelit, mutta vain
  // kapteenit voivat hyväksyä/hylätä.
  const { data: teamGameRows } = await supabase
    .from("game_players")
    .select("game_id")
    .eq("user_id", user.id);
  const teamGameIds = (teamGameRows ?? []).map((r) => r.game_id as string);

  let q = supabase
    .from("games")
    .select(
      `id, sport, status, team_size, scheduled_at, created_at,
       challenger_id, opponent_id,
       challenger:users!games_challenger_id_fkey(id, nickname),
       opponent:users!games_opponent_id_fkey(id, nickname)`,
    )
    .order("created_at", { ascending: false });

  // OR-filtteri: kapteenina TAI tiimipelaajana.
  const orFilter = teamGameIds.length
    ? `challenger_id.eq.${user.id},opponent_id.eq.${user.id},id.in.(${teamGameIds.join(",")})`
    : `challenger_id.eq.${user.id},opponent_id.eq.${user.id}`;
  q = q.or(orFilter);

  if (sportFilter) q = q.eq("sport", sportFilter);

  const { data: games } = await q;
  const rows = (games ?? []) as unknown as GameRow[];

  // Hae pelaajat näytetyille tiimipeleille.
  const shownGameIds = rows.filter((g) => g.team_size > 1).map((g) => g.id);
  let playersByGame: Record<string, GamePlayer[]> = {};
  if (shownGameIds.length) {
    const { data: gps } = await supabase
      .from("game_players")
      .select(`game_id, user_id, team, user:users(id, nickname)`)
      .in("game_id", shownGameIds);
    playersByGame = ((gps ?? []) as unknown as GamePlayer[]).reduce(
      (acc, gp) => {
        (acc[gp.game_id] ??= []).push(gp);
        return acc;
      },
      {} as Record<string, GamePlayer[]>,
    );
  }

  // Kapteenina vastattavat (vain sinä voit hyväksyä/hylätä).
  const incoming = rows.filter(
    (g) => g.opponent_id === user.id && g.status === "pending",
  );
  // Omat lähettämäni haasteet jotka odottavat vastausta.
  const sent = rows.filter(
    (g) => g.challenger_id === user.id && g.status === "pending",
  );
  // Tiimiläisenä odottavat (et ole kapteeni, joku muu päättää).
  const teamPending = rows.filter(
    (g) =>
      g.status === "pending" &&
      g.challenger_id !== user.id &&
      g.opponent_id !== user.id,
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
            <GameCard
              key={g.id}
              g={g}
              myId={user.id}
              players={playersByGame[g.id]}
            >
              <RespondButtons challengeId={g.id} />
            </GameCard>
          ))
        )}
      </Section>

      <Section title={`Lähetetyt (${sent.length})`}>
        {sent.length === 0 ? (
          <Empty text="Ei lähetettyjä haasteita." />
        ) : (
          sent.map((g) => (
            <GameCard
              key={g.id}
              g={g}
              myId={user.id}
              players={playersByGame[g.id]}
            />
          ))
        )}
      </Section>

      {teamPending.length > 0 && (
        <Section title={`Tiimisi peleissä mukana (${teamPending.length})`}>
          {teamPending.map((g) => (
            <GameCard
              key={g.id}
              g={g}
              myId={user.id}
              players={playersByGame[g.id]}
            />
          ))}
        </Section>
      )}

      <Section title="Historia">
        {other.length === 0 ? (
          <Empty text="Ei vielä päättyneitä haasteita." />
        ) : (
          other.map((g) => (
            <GameCard
              key={g.id}
              g={g}
              myId={user.id}
              players={playersByGame[g.id]}
            />
          ))
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
  players,
  children,
}: {
  g: GameRow;
  myId: string;
  players?: GamePlayer[];
  children?: React.ReactNode;
}) {
  const iAmCaptain = g.challenger_id === myId || g.opponent_id === myId;
  const other = g.challenger_id === myId ? g.opponent : g.challenger;
  const direction = iAmCaptain
    ? g.challenger_id === myId
      ? "Sinä vs"
      : "haastaa sinut"
    : "Tiimisi mukana";

  const homePlayers = players?.filter((p) => p.team === "home") ?? [];
  const awayPlayers = players?.filter((p) => p.team === "away") ?? [];
  const showTeams = g.team_size > 1 && players && players.length > 0;

  return (
    <article className="rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SPORT_BADGE[g.sport]}`}
          >
            {SPORT_EMOJI[g.sport]} {SPORT_LABEL[g.sport]}
          </span>
          {g.team_size > 1 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {g.team_size}v{g.team_size}
            </span>
          )}
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[g.status]}`}
        >
          {STATUS_LABEL[g.status]}
        </span>
      </div>

      {showTeams ? (
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          <TeamList players={homePlayers} myId={myId} align="left" />
          <span className="text-zinc-400 text-sm font-bold">vs</span>
          <TeamList players={awayPlayers} myId={myId} align="right" />
        </div>
      ) : (
        <p className="mt-2 text-base">
          <span className="text-zinc-500 text-sm">{direction} </span>
          <span className="font-bold">@{other?.nickname ?? "—"}</span>
        </p>
      )}

      {g.scheduled_at && (
        <p className="text-xs text-zinc-500 mt-1">
          🕐 {new Date(g.scheduled_at).toLocaleString("fi-FI")}
        </p>
      )}

      {g.status === "accepted" && iAmCaptain && (
        <Link
          href={`/tulokset?game=${g.id}`}
          className="mt-3 block text-center rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm py-2 font-semibold"
        >
          Kirjaa tulos →
        </Link>
      )}
      {g.status === "accepted" && !iAmCaptain && (
        <p className="mt-3 text-xs text-zinc-500 italic text-center">
          Tuloksen kirjaa kapteeni
        </p>
      )}

      {children}
    </article>
  );
}

function TeamList({
  players,
  myId,
  align,
}: {
  players: GamePlayer[];
  myId: string;
  align: "left" | "right";
}) {
  return (
    <ul
      className={`flex flex-col gap-0.5 ${
        align === "right" ? "items-end text-right" : "items-start text-left"
      }`}
    >
      {players.map((p) => (
        <li
          key={p.user_id}
          className={`text-sm ${
            p.user_id === myId
              ? "font-bold text-violet-700 dark:text-violet-300"
              : "font-medium"
          }`}
        >
          @{p.user?.nickname ?? "?"}
        </li>
      ))}
    </ul>
  );
}
