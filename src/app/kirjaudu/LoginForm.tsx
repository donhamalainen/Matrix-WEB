"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Sähköpostipohjainen kirjautuminen.
 *
 * Vaihe 1: syötä sähköposti → Supabase lähettää viestin, jossa on sekä
 *          klikattava vahvistuslinkki että 6-numeroinen koodi.
 * Vaihe 2: joko klikkaa linkkiä **samasta selaimesta** TAI syötä koodi alla.
 *
 * Linkki on luotettavin kun viesti avataan samalta laitteelta, jolla pyyntö
 * tehtiin. Eri laitteelle siirryttäessä on aina varminta käyttää koodia.
 *
 * Vaatimukset Supabasessa:
 *  - Authentication → Email-provider on (oletus: päällä)
 *  - Email Templates → "Confirm signup" JA "Magic Link" sisältävät sekä
 *    `{{ .ConfirmationURL }}` että `{{ .Token }}` jotta sekä linkki että
 *    koodi toimivat. Linkin tulisi osoittaa `<SiteURL>/auth/callback`
 *    (tai `/auth/confirm` — molempia tuetaan).
 *  - Lokaalisti: koodit/linkit näkyvät Mailpitissa (http://127.0.0.1:54324)
 */
export default function LoginForm() {
  const router = useRouter();
  // Yksi instanssi koko komponentin elämäksi.
  const [supabase] = useState(() => createClient());

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Ensisijaisesti NEXT_PUBLIC_SITE_URL (tuotannossa aina matrix.boggo.fi),
    // fallback selaimen originiin lokaalia kehitystä varten.
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : undefined);
    if (!siteUrl) {
      setLoading(false);
      setError("Sivuston URL puuttuu (NEXT_PUBLIC_SITE_URL).");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Ohjataan juureen — kirjaudu/page.tsx tekee oikean valinnan profiilin
    // mukaan (joko /pelit tai /auth/nimimerkki).
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 p-6">
      <h1 className="text-2xl font-bold mb-1">Matrix</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Kirjaudu sähköpostilla — saat viestin, jossa on linkki ja koodi.
      </p>

      {step === "email" ? (
        <form onSubmit={sendOtp} className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="email">
            Sähköposti
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nimi@esimerkki.fi"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-3 text-base outline-none focus:ring-2 focus:ring-violet-400"
          />
          <button
            type="submit"
            disabled={loading || !email.includes("@")}
            className="mt-2 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-60 text-white font-semibold py-3"
          >
            {loading ? "Lähetetään..." : "Lähetä viesti"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="flex flex-col gap-3">
          <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 ring-1 ring-violet-200 dark:ring-violet-900 p-3 text-sm text-violet-800 dark:text-violet-200">
            Lähetimme viestin osoitteeseen{" "}
            <span className="font-mono">{email}</span>.
            <br />
            Klikkaa linkkiä viestissä <strong>tai</strong> syötä koodi alla.
          </div>
          <label className="text-sm font-medium mt-1" htmlFor="otp">
            6-numeroinen koodi
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-3 text-2xl tracking-[0.5em] text-center font-mono outline-none focus:ring-2 focus:ring-violet-400"
          />
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="mt-2 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-60 text-white font-semibold py-3"
          >
            {loading ? "Vahvistetaan..." : "Kirjaudu koodilla"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOtp("");
              setError(null);
              setStep("email");
            }}
            className="text-sm text-zinc-500 underline"
          >
            Vaihda sähköposti
          </button>
        </form>
      )}

      {error && (
        <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
