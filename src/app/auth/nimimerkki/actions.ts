"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Luo public.users-rivi kirjautuneelle käyttäjälle.
 * phone ja email luetaan auth.users:sta — clientin syötteisiin ei luoteta.
 */
export async function createProfile(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const raw = String(formData.get("nickname") ?? "");
  const nickname = raw.trim();

  if (nickname.length < 2 || nickname.length > 20) {
    return { error: "Nimimerkin pituus täytyy olla 2–20 merkkiä." };
  }
  if (!/^[\p{L}\p{N}_-]+$/u.test(nickname)) {
    return {
      error: "Vain kirjaimet, numerot, alaviiva ja viiva ovat sallittuja.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Istunto vanhentunut, kirjaudu uudelleen." };

  const { error } = await supabase.from("users").insert({
    id: user.id,
    nickname,
    phone: user.phone ?? null,
    email: user.email ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Nimimerkki on jo käytössä." };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
