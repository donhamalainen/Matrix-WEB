"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Kuuntelee Supabase Realtime -muutoksia games- ja results-tauluihin
 * ja päivittää sivun automaattisesti ilman manuaalista refreshiä.
 */
export function RealtimeRefresh() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
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
  }, []);

  return null;
}
