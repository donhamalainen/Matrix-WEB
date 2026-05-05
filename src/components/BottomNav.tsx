"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Alapalkki — mobiili-ensin navigointi neljään päänäkymään.
const TABS = [
  { href: "/pelit", label: "Pelit", icon: "🎮" },
  { href: "/haasteet", label: "Haasteet", icon: "⚔️" },
  { href: "/tulokset", label: "Tulokset", icon: "📊" },
  { href: "/ranking", label: "Ranking", icon: "🏆" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 border-t border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur safe-bottom">
      <ul className="grid grid-cols-4 max-w-md mx-auto">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                }`}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
