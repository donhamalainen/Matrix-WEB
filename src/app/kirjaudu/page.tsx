import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

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

  return (
    <main className="flex-1 flex items-center justify-center p-4 min-h-screen bg-linear-to-br from-violet-50 via-white to-rose-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {sp.error === "link_expired" && (
        <div className="absolute top-4 left-4 right-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 ring-1 ring-amber-200 dark:ring-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300 text-center">
          Linkki ei toiminut — kirjaudu uudelleen samalla selaimella.
        </div>
      )}
      <LoginForm />
    </main>
  );
}
