export type Sport = "football" | "basketball" | "pingpong";

export const SPORTS: { value: Sport; label: string; emoji: string }[] = [
  { value: "football", label: "Jalkapallo", emoji: "⚽" },
  { value: "basketball", label: "Koripallo", emoji: "🏀" },
  { value: "pingpong", label: "Pingis", emoji: "🏓" },
];

export const SPORT_LABEL: Record<Sport, string> = {
  football: "Jalkapallo",
  basketball: "Koripallo",
  pingpong: "Pingis",
};

export const SPORT_EMOJI: Record<Sport, string> = {
  football: "⚽",
  basketball: "🏀",
  pingpong: "🏓",
};

// Tailwind v4 dynaamiset luokat eivät tueta suoraan -> käytetään valmiita ryhmiä.
// Pastellivärit kilpailuhenkiseen teemaan.
export const SPORT_BADGE: Record<Sport, string> = {
  football:
    "bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800",
  basketball:
    "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800",
  pingpong:
    "bg-teal-100 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800",
};

export const SPORT_DOT: Record<Sport, string> = {
  football: "bg-rose-400",
  basketball: "bg-amber-400",
  pingpong: "bg-teal-400",
};
