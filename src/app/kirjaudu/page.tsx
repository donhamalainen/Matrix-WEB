import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  link_expired:
    "Linkki ei toiminut. Linkit ovat kertakäyttöisiä ja toimivat vain samassa selaimessa, jossa pyyntö tehtiin — kokeile uudelleen tai käytä alta saamaasi koodia.",
  otp_expired:
    "Linkki tai koodi vanhentui. Pyydä uusi viesti syöttämällä sähköposti uudelleen.",
  access_denied:
    "Vahvistus epäonnistui. Pyydä uusi linkki/koodi alla olevalla lomakkeella.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

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

  const errorMessage = sp.error
    ? (ERROR_MESSAGES[sp.error] ?? "Kirjautumisessa tapahtui virhe.")
    : null;

  return (
    <main className="relative flex-1 flex items-center justify-center p-4 min-h-screen bg-linear-to-br from-violet-50 via-white to-rose-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {errorMessage && (
        <div className="absolute top-4 left-4 right-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 ring-1 ring-amber-200 dark:ring-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300 text-center">
          {errorMessage}
        </div>
      )}
      <LoginForm />
    </main>
  );
}
