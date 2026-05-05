"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Sport } from "@/lib/sports";

/** Lähetä haaste toiselle pelaajalle. */
export async function sendChallenge(formData: FormData) {
  const opponentId = String(formData.get("opponent_id") ?? "");
  const sport = String(formData.get("sport") ?? "") as Sport;

  if (!opponentId) return { error: "Valitse vastustaja" };
  if (!["football", "basketball", "pingpong"].includes(sport))
    return { error: "Valitse laji" };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  if (user.id === opponentId) return { error: "Et voi haastaa itseäsi" };

  const { error } = await supabase.from("games").insert({
    challenger_id: user.id,
    opponent_id: opponentId,
    sport,
  });

  if (error) return { error: error.message };
  revalidatePath("/pelit");
  revalidatePath("/haasteet");
  return { ok: true };
}
