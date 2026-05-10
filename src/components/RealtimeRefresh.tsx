"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Kuuntelee Supabase Realtime -muutoksia games- ja results-tauluihin
 * ja päivittää sivun automaattisesti ilman manuaalista refreshiä.
 */
export function RealtimeRefresh() {
  const router = useRouter();
  // Stabiloidaan client — ei luoda uutta instanssia joka renderöinnillä.
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();

  useEffect(() => {
    const supabase = supabaseRef.current!;
    const channel = supabase
      .channel("matrix-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "results" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
