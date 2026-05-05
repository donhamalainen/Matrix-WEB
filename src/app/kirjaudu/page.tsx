import LoginForm from "./LoginForm";

export default function Page() {
  return (
    <main className="flex-1 flex items-center justify-center p-4 min-h-screen bg-linear-to-br from-violet-50 via-white to-rose-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <LoginForm />
    </main>
  );
}
