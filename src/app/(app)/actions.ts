"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Kirjaa käyttäjän ulos ja ohjaa kirjautumissivulle. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Tyhjennä kaikki cached server component -näkymät, ettei seuraava
  // käyttäjä näe edellisen dataa.
  revalidatePath("/", "layout");
  redirect("/kirjaudu");
}
