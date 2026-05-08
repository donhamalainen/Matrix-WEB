import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/pelit";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  // Estä open-redirect: salli vain saman originin sisäiset polut.
  // Hylkää protocol-relative (//evil.com), backslash-temput ja absoluuttiset URLit.
  const isSafe =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\");
  const next = isSafe ? rawNext : "/pelit";

  const response = NextResponse.redirect(`${siteUrl}${next}`);

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

  // PKCE-flow: magic link / OTP sähköpostilinkki
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }

  // Implicit-flow: confirm signup / email change
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return response;
  }

  // Virhetilanteessa ohjaa kirjautumissivulle
  return NextResponse.redirect(`${siteUrl}/kirjaudu`);
}
