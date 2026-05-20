"use client";

import { useTransition } from "react";
import { acceptJoinRequest, declineJoinRequest } from "./actions";

type JoinRequest = {
  id: string;
  nickname: string;
};

export default function ClanJoinRequests({
  requests,
}: {
  requests: JoinRequest[];
}) {
  if (requests.length === 0) return null;

  return (
    <section className="rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 p-5">
      <h2 className="font-bold mb-3">Liittymispyynnöt ({requests.length})</h2>
      <ul className="flex flex-col gap-2">
        {requests.map((r) => (
          <RequestCard key={r.id} request={r} />
        ))}
      </ul>
    </section>
  );
}

function RequestCard({ request }: { request: JoinRequest }) {
  const [pending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const res = await acceptJoinRequest(request.id);
      if (res?.error) alert(res.error);
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const res = await declineJoinRequest(request.id);
      if (res?.error) alert(res.error);
    });
  }

  return (
    <li className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="font-medium">@{request.nickname}</span>
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={pending}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          {pending ? "..." : "Hyväksy"}
        </button>
        <button
          onClick={handleDecline}
          disabled={pending}
          className="text-xs text-rose-500 hover:text-rose-700 disabled:opacity-50 font-semibold px-3 py-1.5"
        >
          Hylkää
        </button>
      </div>
    </li>
  );
}
