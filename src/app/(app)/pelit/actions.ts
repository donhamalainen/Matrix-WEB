"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SPORTS, type Sport } from "@/lib/sports";

const VALID_SPORTS = SPORTS.map((s) => s.value);

/** Lähetä haaste. Tukee 1v1 ja tiimipelejä. */
export async function sendChallenge(formData: FormData) {
  const sport = String(formData.get("sport") ?? "") as Sport;
  const teamSize = Math.max(
    1,
    parseInt(String(formData.get("team_size") ?? "1"), 10) || 1,
  );

  // Tiimit JSON-muodossa.
  let homeTeam: string[] = [];
  let awayTeam: string[] = [];
  try {
    homeTeam = JSON.parse(String(formData.get("home_team") ?? "[]"));
    awayTeam = JSON.parse(String(formData.get("away_team") ?? "[]"));
  } catch {
    return { error: "Virheelliset tiimitiedot" };
  }

  if (!VALID_SPORTS.includes(sport)) return { error: "Valitse laji" };
  if (awayTeam.length === 0) return { error: "Valitse vastustaja(t)" };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  // Tarkista ettei itse ole vastustajissa.
  if (awayTeam.includes(user.id))
    return { error: "Et voi olla omassa vastustajatiimissä" };

  // Vastustajan kapteeni = ensimmäinen away-pelaaja (haasteen vastaanottaja).
  const opponentCaptain = awayTeam[0];

  // Luo peli.
  const { data: game, error: gameErr } = await supabase
    .from("games")
    .insert({
      challenger_id: user.id,
      opponent_id: opponentCaptain,
      sport,
      team_size: teamSize,
    })
    .select("id")
    .single();

  if (gameErr) return { error: gameErr.message };

  // Tallenna pelaajat game_players-tauluun (myös 1v1:ssä jotta leaderboard toimii yhtenäisesti).
  const gamePlayers = [
    // Home-tiimi: sinä + tiimiläiset.
    { game_id: game.id, user_id: user.id, team: "home" as const },
    ...homeTeam.map((id) => ({
      game_id: game.id,
      user_id: id,
      team: "home" as const,
    })),
    // Away-tiimi: kaikki vastustajat.
    ...awayTeam.map((id) => ({
      game_id: game.id,
      user_id: id,
      team: "away" as const,
    })),
  ];

  const { error: playersErr } = await supabase
    .from("game_players")
    .insert(gamePlayers);

  if (playersErr) return { error: playersErr.message };

  revalidatePath("/pelit");
  revalidatePath("/haasteet");
  return { ok: true };
}
