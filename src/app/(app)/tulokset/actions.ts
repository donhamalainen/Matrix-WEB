"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Kirjaa tulos pelille. Pisteet haastajan ja vastustajan näkökulmasta.
 * Flow: Ensimmäinen kirjaaja syöttää tuloksen → toinen hyväksyy tai hylkää.
 * Hylkäys = vastatarjous (uudet pisteet), joka odottaa alkuperäisen kirjaajan hyväksyntää.
 */
export async function recordResult(formData: FormData) {
  const gameId = String(formData.get("game_id") ?? "");
  const challengerScore = Number(formData.get("score_challenger") ?? -1);
  const opponentScore = Number(formData.get("score_opponent") ?? -1);

  if (!gameId) return { error: "Peli puuttuu" };
  if (challengerScore < 0 || opponentScore < 0)
    return { error: "Anna molemmat pisteet" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  const { data: game } = await supabase
    .from("games")
    .select("challenger_id, opponent_id, status")
    .eq("id", gameId)
    .single();
  if (!game) return { error: "Peliä ei löydy" };

  const isChallenger = game.challenger_id === user.id;
  const isOpponent = game.opponent_id === user.id;
  if (!isChallenger && !isOpponent)
    return { error: "Et ole tämän pelin osapuoli" };

  if (game.status !== "accepted") {
    return {
      error:
        game.status === "completed"
          ? "Peli on jo merkitty pelatuksi."
          : "Tulosta voi kirjata vain hyväksytylle pelille.",
    };
  }

  const { data: existing } = await supabase
    .from("results")
    .select(
      "id, score_challenger, score_opponent, confirmed_by_challenger, confirmed_by_opponent",
    )
    .eq("game_id", gameId)
    .maybeSingle();

  if (existing) {
    // Molemmat vahvistaneet → lukittu.
    if (existing.confirmed_by_challenger && existing.confirmed_by_opponent) {
      return { error: "Tulos on jo vahvistettu eikä sitä voi enää muuttaa." };
    }

    const same =
      existing.score_challenger === challengerScore &&
      existing.score_opponent === opponentScore;

    // Sama tulos → toinen osapuoli hyväksyy (vahvistaa).
    // Eri tulos → vastatarjous: korvaa pisteet, vain lähettäjä on vahvistanut.
    const update = same
      ? {
          confirmed_by_challenger:
            existing.confirmed_by_challenger || isChallenger,
          confirmed_by_opponent: existing.confirmed_by_opponent || isOpponent,
        }
      : {
          score_challenger: challengerScore,
          score_opponent: opponentScore,
          confirmed_by_challenger: isChallenger,
          confirmed_by_opponent: isOpponent,
          recorded_by: user.id,
        };

    const { error } = await supabase
      .from("results")
      .update(update)
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    // Ensimmäinen tuloskirjaus.
    const { error } = await supabase.from("results").insert({
      game_id: gameId,
      score_challenger: challengerScore,
      score_opponent: opponentScore,
      confirmed_by_challenger: isChallenger,
      confirmed_by_opponent: isOpponent,
      recorded_by: user.id,
    });
    if (error) return { error: error.message };
  }

  // Pelin status -> 'completed' tehdään tietokannan triggerillä
  // (complete_game_when_confirmed) kun molemmat ovat vahvistaneet.

  revalidatePath("/tulokset");
  revalidatePath("/haasteet");
  revalidatePath("/ranking");
  return { ok: true };
}
