"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { castVote } from "@/app/(app)/groups/actions";

export default function VoteButtons({ approvalId, disabled }: { approvalId: string; disabled: boolean }) {
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<"APPROVE" | "REJECT" | null>(null);

  function vote(choice: "APPROVE" | "REJECT") {
    setWhich(choice);
    const data = new FormData();
    data.set("approvalId", approvalId);
    data.set("vote", choice);
    start(async () => {
      await castVote(data);
    });
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <button onClick={() => vote("APPROVE")} disabled={pending || disabled} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-free-600 font-semibold text-white disabled:opacity-60">
        <Check size={18} strokeWidth={3} /> {pending && which === "APPROVE" ? "Approving…" : "Approve"}
      </button>
      <button onClick={() => vote("REJECT")} disabled={pending || disabled} className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-frozen-500 bg-white font-semibold text-frozen-600 disabled:opacity-60">
        <X size={18} strokeWidth={3} /> {pending && which === "REJECT" ? "Declining…" : "Decline"}
      </button>
    </div>
  );
}
