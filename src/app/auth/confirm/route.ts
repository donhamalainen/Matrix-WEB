import type { NextRequest } from "next/server";
import { handleAuthRedirect } from "../_shared";

// Supabasen sähköpostimallien oletus-URL on `<SITE_URL>/auth/confirm`.
// Tämä reitti delegoi saman käsittelyn kuin /auth/callback.
export async function GET(request: NextRequest) {
  return handleAuthRedirect(request);
}
