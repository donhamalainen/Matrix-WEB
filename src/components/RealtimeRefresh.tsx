"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Kuuntelee Supabase Realtime -muutoksia games- ja results-tauluihin
 * ja päivittää sivun automaattisesti ilman manuaalista refreshiä.
 * Debounce estää refresh-stormin.
 */
export function RealtimeRefresh() {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();

  const debouncedRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      router.refresh();
    }, 1000);
  }, [router]);

  useEffect(() => {
    const supabase = supabaseRef.current!;
    const channel = supabase
      .channel("matrix-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        debouncedRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "results" },
        debouncedRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players" },
        debouncedRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clan_members" },
        debouncedRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clan_invites" },
        debouncedRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clan_join_requests" },
        debouncedRefresh,
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [debouncedRefresh]);

  return null;
}
