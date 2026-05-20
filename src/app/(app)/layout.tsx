import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import TopBar from "./TopBar";

/**
 * Kirjautumista vaativa app-shell layout.
 * - Tarkistaa että käyttäjä on luonut nimimerkin.
 * - Renderöi yläpalkin + alanavigaation.
 * - Aktivoi Realtime-päivityksen koko sovellukseen.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getProfile();

  const nickname = profile?.nickname?.trim();
  if (!nickname || nickname.length < 2) {
    redirect("/auth/nimimerkki");
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <RealtimeRefresh />
      <TopBar nickname={nickname} />
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
