import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import NicknameForm from "./NicknameForm";

/**
 * Nimimerkin asetussivu.
 * Jos käyttäjällä on jo profiili tietokannassa, ohjataan suoraan tiimi-sivulle.
 */
export default async function Page() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("users")
    .select("id, nickname")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.nickname) {
    redirect("/pelit");
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 min-h-screen bg-linear-to-br from-violet-50 via-white to-rose-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <NicknameForm phone={user.phone ?? null} email={user.email ?? null} />
    </main>
  );
}
