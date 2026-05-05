"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Kirjaa käyttäjän ulos ja ohjaa kirjautumissivulle. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/kirjaudu");
}
