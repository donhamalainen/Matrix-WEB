import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Yhteinen käsittelijä Supabase-sähköpostilinkeille.
 * Tukee sekä PKCE-flowta (`code`) että implicit OTP-flowta (`token_hash` + `type`).
 *
 * Käytetään sekä `/auth/callback`- että `/auth/confirm`-reiteissä, jotta
 * Supabasen sähköpostimallien oletus-URL (`<SITE_URL>/auth/confirm?...`) ja
 * sovelluksessa määritelty `emailRedirectTo` (`/auth/callback`) toimivat
 * molemmat.
 */
export async function handleAuthRedirect(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const errorParam =
    searchParams.get("error") ?? searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");
  const rawNext = searchParams.get("next") ?? "/pelit";

  // Estä open-redirect: salli vain saman originin sisäiset polut.
  const isSafe =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\");
  const next = isSafe ? rawNext : "/pelit";

  // KÄYTÄ AINA NEXT_PUBLIC_SITE_URL -arvoa, EI `request.nextUrl.origin`,
  // koska Nginxin takana Next.js voi nähdä originin "localhost:3001" eikä
  // "https://matrix.boggo.fi". Tämä varmistaa että käyttäjä päätyy aina
  // sovelluksen oikeaan julkiseen osoitteeseen.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL puuttuu — auth-redirect ei voi rakentaa kohde-URLia.",
    );
  }

  const successUrl = new URL(next, siteUrl);
  const response = NextResponse.redirect(successUrl);

  // Jos Supabase välitti virheen suoraan paramissa, ohjaa kirjautumiseen.
  if (errorParam) {
    console.error("Auth redirect error:", errorParam, errorDescription);
    return NextResponse.redirect(
      new URL(`/kirjaudu?error=${encodeURIComponent(errorParam)}`, siteUrl),
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // PKCE-flow: magic link / OTP -linkki samasta selaimesta
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
    console.error("exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(
      new URL("/kirjaudu?error=link_expired", siteUrl),
    );
  }

  // Implicit-flow: confirm signup / email change / magic link eri selaimesta
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return response;
    console.error("verifyOtp failed:", error.message);
    return NextResponse.redirect(
      new URL("/kirjaudu?error=link_expired", siteUrl),
    );
  }

  // Ei tunnistettavaa paramia — palaa kirjautumiseen.
  return NextResponse.redirect(new URL("/kirjaudu", siteUrl));
}
