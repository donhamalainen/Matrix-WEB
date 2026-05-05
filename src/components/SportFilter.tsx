"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SPORTS, type Sport } from "@/lib/sports";

/** Yhteinen lajisuodatin URL-parametrilla ?sport=. */
export default function SportFilter() {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("sport") as Sport | null;

  function href(sport: Sport | null) {
    const sp = new URLSearchParams(params.toString());
    if (sport) sp.set("sport", sport);
    else sp.delete("sport");
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const items: { value: Sport | null; label: string; emoji: string }[] = [
    { value: null, label: "Kaikki", emoji: "🎯" },
    ...SPORTS.map((s) => ({ value: s.value, label: s.label, emoji: s.emoji })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((it) => {
        const active = current === it.value || (it.value === null && !current);
        return (
          <Link
            key={it.label}
            href={href(it.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
              active
                ? "bg-violet-500 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
            }`}
          >
            {it.emoji} {it.label}
          </Link>
        );
      })}
    </div>
  );
}
