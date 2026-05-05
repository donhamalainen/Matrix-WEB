import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Vaatii kirjautumisen — ohjaa /kirjaudu-sivulle ellei kirjautunut. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");
  return { supabase, user };
}

/** Hakee käyttäjäprofiilin (users-taulu). */
export async function getProfile() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("users")
    .select("id, nickname, phone, email")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, profile };
}
