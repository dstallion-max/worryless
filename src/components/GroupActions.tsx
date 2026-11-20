"use client";

import { useState } from "react";
import { HandCoins, PiggyBank, UserPlus } from "lucide-react";
import Sheet, { fieldClass, labelClass } from "./Sheet";
import ActionForm from "./ActionForm";
import { contribute, inviteMember, requestRelease } from "@/app/(app)/groups/actions";
import { formatNaira } from "@/lib/money";

type Which = "contribute" | "release" | "invite" | null;

export default function GroupActions({ groupId, isAdmin, freeKobo, disabled }: { groupId: string; isAdmin: boolean; freeKobo: number; disabled: boolean }) {
  const [open, setOpen] = useState<Which>(null);
  const close = () => setOpen(null);
  const secondary = "flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-slate-800 disabled:opacity-60";

  return (
    <>
      <button onClick={() => setOpen("contribute")} disabled={disabled} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-700 py-3.5 font-semibold text-white shadow-sm disabled:opacity-60">
        <PiggyBank size={20} /> Contribute
      </button>
      <div className="mt-3 flex gap-3">
        <button onClick={() => setOpen("release")} disabled={disabled} className={secondary}>
          <HandCoins size={18} /> Request release
        </button>
        {isAdmin && (
          <button onClick={() => setOpen("invite")} disabled={disabled} className={secondary}>
            <UserPlus size={18} /> Invite
          </button>
        )}
      </div>

      {open === "contribute" && (
        <Sheet title="Contribute to the pool" onClose={close}>
          <ActionForm action={contribute} submitLabel="Add to pool" pendingLabel="Adding…" className="space-y-4">
            <input type="hidden" name="groupId" value={groupId} />
            <div>
              <label htmlFor="c-amount" className={labelClass}>Amount (₦)</label>
              <input id="c-amount" name="amount" className={fieldClass} type="number" inputMode="decimal" min="1" step="any" placeholder="5000" required autoFocus />
              <p className="mt-1.5 text-xs text-slate-500">Comes from your available balance: {formatNaira(freeKobo)}.</p>
            </div>
          </ActionForm>
        </Sheet>
      )}

      {open === "release" && (
        <Sheet title="Request a release" onClose={close}>
          <ActionForm action={requestRelease} submitLabel="Ask the group to approve" pendingLabel="Sending…" className="space-y-4">
            <input type="hidden" name="groupId" value={groupId} />
            <div>
              <label htmlFor="r-amount" className={labelClass}>Amount (₦)</label>
              <input id="r-amount" name="amount" className={fieldClass} type="number" inputMode="decimal" min="1" step="any" required autoFocus />
            </div>
            <div>
              <label htmlFor="r-purpose" className={labelClass}>What is it for?</label>
              <input id="r-purpose" name="purpose" className={fieldClass} placeholder="e.g. Rent" maxLength={60} required />
            </div>
            <p className="text-xs text-slate-500">If enough members approve, the money goes to your available balance.</p>
          </ActionForm>
        </Sheet>
      )}

      {open === "invite" && (
        <Sheet title="Invite a member" onClose={close}>
          <ActionForm action={inviteMember} submitLabel="Add to group" pendingLabel="Adding…" className="space-y-4">
            <input type="hidden" name="groupId" value={groupId} />
            <div>
              <label htmlFor="i-email" className={labelClass}>Their email</label>
              <input id="i-email" name="email" className={fieldClass} type="email" inputMode="email" placeholder="friend@example.com" required autoFocus />
              <p className="mt-1.5 text-xs text-slate-500">They need a Worryless account first.</p>
            </div>
          </ActionForm>
        </Sheet>
      )}
    </>
  );
}
