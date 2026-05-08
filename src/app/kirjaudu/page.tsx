import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Jos käyttäjällä on jo sessio, päätetään ohjaus serverillä — ei välkkyvää
  // client-redirectiä. Ohjataan suoraan oikeaan kohteeseen profiilin mukaan.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("me")
      .select("nickname")
      .maybeSingle();
    redirect(
      profile?.nickname && profile.nickname.trim().length >= 2
        ? "/pelit"
        : "/auth/nimimerkki",
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 min-h-screen bg-linear-to-br from-violet-50 via-white to-rose-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <LoginForm />
    </main>
  );
}
