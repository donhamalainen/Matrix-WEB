import CreateClanForm from "./CreateClanForm";

export default function LuoClanPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Luo Clan 🛡️</h1>
      <section className="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-5">
        <CreateClanForm />
      </section>
    </div>
  );
}
