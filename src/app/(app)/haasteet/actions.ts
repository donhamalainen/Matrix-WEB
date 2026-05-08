"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Hyväksy tai hylkää haaste. Vain vastustaja saa tämän tehdä. */
export async function respondChallenge(
  challengeId: string,
  accept: boolean,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  // Vain vastustaja voi vastata, ja vain pending-tilassa olevaan haasteeseen.
  // .select() palauttaa muuttuneet rivit -> tarkistetaan rowcount.
  const { data, error } = await supabase
    .from("games")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", challengeId)
    .eq("opponent_id", user.id)
    .eq("status", "pending")
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Haastetta ei löytynyt tai siihen on jo vastattu." };
  }

  revalidatePath("/haasteet");
  revalidatePath("/pelit");
  return { ok: true };
}
