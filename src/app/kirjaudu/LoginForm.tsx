"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Email OTP -kirjautumislomake.
 * Vaihe 1: syötä sähköposti → Supabase lähettää 6-numeroisen koodin.
 * Vaihe 2: syötä koodi sähköpostista → kirjaudutaan sisään.
 *
 * Vaatimukset Supabasessa:
 *  - Authentication → Email-provider on (oletus: päällä)
 *  - Email Templates → "Magic Link" -mallin sisällössä on {{ .Token }}
 *    (lähettää 6-numeroisen koodin pelkän linkin sijaan)
 *  - Lokaalisti: koodit näkyvät Mailpitissa (http://127.0.0.1:54324)
 */
export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Tärkeää: salli uusien käyttäjien rekisteröityminen tällä flowllä.
        shouldCreateUser: true,
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
    router.replace("/auth/nimimerkki");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 p-6">
      <h1 className="text-2xl font-bold mb-1">Matrix</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Kirjaudu sähköpostilla — saat 6-numeroisen koodin viestillä.
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
            {loading ? "Lähetetään..." : "Lähetä koodi"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="otp">
            Syötä 6-numeroinen koodi
          </label>
          <p className="text-xs text-zinc-500 -mt-1">
            Lähetetty osoitteeseen <span className="font-mono">{email}</span>
          </p>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
            maxLength={6}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-3 text-2xl tracking-[0.5em] text-center font-mono outline-none focus:ring-2 focus:ring-violet-400"
          />
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="mt-2 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-60 text-white font-semibold py-3"
          >
            {loading ? "Vahvistetaan..." : "Kirjaudu sisään"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOtp("");
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
