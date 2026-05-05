import { signOut } from "./actions";

/** Yläpalkki — näyttää nimimerkin ja uloskirjautumisen. */
export default function TopBar({ nickname }: { nickname: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-violet-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏟️</span>
          <span className="font-bold bg-linear-to-r from-violet-600 to-rose-500 bg-clip-text text-transparent">
            Matrix
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">@{nickname}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-zinc-400 hover:text-rose-500 underline"
            >
              Kirjaudu ulos
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
