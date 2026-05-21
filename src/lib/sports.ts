export type Sport =
  | "football"
  | "basketball"
  | "pingpong"
  | "volleyball"
  | "tennis"
  | "badminton"
  | "icehockey"
  | "darts"
  | "billiards"
  | "martialarts"
  | "golf"
  | "discgolf"
  | "padel"
  | "other";

export const SPORTS: { value: Sport; label: string; emoji: string }[] = [
  { value: "football", label: "Jalkapallo", emoji: "⚽" },
  { value: "basketball", label: "Koripallo", emoji: "🏀" },
  { value: "pingpong", label: "Pingis", emoji: "🏓" },
  { value: "volleyball", label: "Lentopallo", emoji: "🏐" },
  { value: "tennis", label: "Tennis", emoji: "🎾" },
  { value: "padel", label: "Padel", emoji: "🎾" },
  { value: "badminton", label: "Sulkapallo", emoji: "🏸" },
  { value: "icehockey", label: "Jääkiekko", emoji: "🏒" },
  { value: "golf", label: "Golf", emoji: "⛳" },
  { value: "discgolf", label: "Frisbeegolf", emoji: "🥏" },
  { value: "darts", label: "Tikka", emoji: "🎯" },
  { value: "billiards", label: "Biljardi", emoji: "🎱" },
  { value: "martialarts", label: "Kamppailulaji", emoji: "🥋" },
  { value: "other", label: "Muut", emoji: "🏅" },
];

export const SPORT_LABEL: Record<Sport, string> = {
  football: "Jalkapallo",
  basketball: "Koripallo",
  pingpong: "Pingis",
  volleyball: "Lentopallo",
  tennis: "Tennis",
  badminton: "Sulkapallo",
  icehockey: "Jääkiekko",
  darts: "Tikka",
  billiards: "Biljardi",
  martialarts: "Kamppailulaji",
  golf: "Golf",
  discgolf: "Frisbeegolf",
  padel: "Padel",
  other: "Muut",
};

export const SPORT_EMOJI: Record<Sport, string> = {
  football: "⚽",
  basketball: "🏀",
  pingpong: "🏓",
  volleyball: "🏐",
  tennis: "🎾",
  badminton: "🏸",
  icehockey: "🏒",
  darts: "🎯",
  billiards: "🎱",
  martialarts: "🥋",
  golf: "⛳",
  discgolf: "🥏",
  padel: "🎾",
  other: "🏅",
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
  volleyball:
    "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800",
  tennis:
    "bg-lime-100 text-lime-700 ring-1 ring-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:ring-lime-800",
  badminton:
    "bg-purple-100 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800",
  icehockey:
    "bg-sky-100 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800",
  darts:
    "bg-orange-100 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800",
  billiards:
    "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800",
  martialarts:
    "bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800",
  golf: "bg-green-100 text-green-700 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800",
  discgolf:
    "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:ring-yellow-800",
  padel:
    "bg-fuchsia-100 text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:ring-fuchsia-800",
  other:
    "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
};

export const SPORT_DOT: Record<Sport, string> = {
  football: "bg-rose-400",
  basketball: "bg-amber-400",
  pingpong: "bg-teal-400",
  volleyball: "bg-indigo-400",
  tennis: "bg-lime-400",
  badminton: "bg-purple-400",
  icehockey: "bg-sky-400",
  darts: "bg-orange-400",
  billiards: "bg-emerald-400",
  martialarts: "bg-red-400",
  golf: "bg-green-400",
  discgolf: "bg-yellow-400",
  padel: "bg-fuchsia-400",
  other: "bg-zinc-400",
};
