"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Hyväksy tai hylkää haaste. Vain vastustaja saa tämän tehdä. */
export async function respondChallenge(
  challengeId: string,
  accept: boolean,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("games")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", challengeId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidatePath("/haasteet");
  return { ok: true };
}
