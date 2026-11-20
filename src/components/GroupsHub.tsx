"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronRight, Users } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { createGroup } from "@/app/(app)/groups/actions";
import { formatNaira } from "@/lib/money";
import { fieldClass, labelClass } from "@/components/Sheet";

export type GroupCard = { id: string; name: string; balanceKobo: number; role: "ADMIN" | "MEMBER"; memberCount: number; rule: string };

export default function GroupsHub({ groups, startOnCreate }: { groups: GroupCard[]; startOnCreate: boolean }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"mine" | "create">(startOnCreate ? "create" : "mine");
  const [pending, start] = useTransition();
  const [required, setRequired] = useState("2");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(async () => {
      const res = await createGroup(data); // redirects to the new group on success
      if (res && "error" in res) toast(res.error, "error");
    });
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${active ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"}`;

  return (
    <>
      <div role="tablist" aria-label="Groups" className="mt-5 flex gap-1 rounded-2xl bg-gray-200/70 p-1">
        <button role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")} className={tabClass(tab === "mine")}>
          My groups{groups.length > 0 && ` (${groups.length})`}
        </button>
        <button role="tab" aria-selected={tab === "create"} onClick={() => setTab("create")} className={tabClass(tab === "create")}>
          Create group
        </button>
      </div>

      {tab === "mine" ? (
        <ul className="mt-5 space-y-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/groups/${g.id}`} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Users size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{g.name}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${g.role === "ADMIN" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-slate-600"}`}>
                      {g.role === "ADMIN" ? "Admin" : "Member"}
                    </span>
                    {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-bold">{formatNaira(g.balanceKobo)}</span>
                  <span className="text-xs text-slate-400">in the pool</span>
                </span>
                <ChevronRight size={18} className="text-slate-400" />
              </Link>
            </li>
          ))}
          {groups.length === 0 && (
            <li className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="font-semibold">No groups yet</p>
              <p className="mt-1 text-sm text-slate-600">Pool money with roommates, friends or a team. Nobody can take it out unless enough people approve.</p>
              <button onClick={() => setTab("create")} className="mt-4 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white">
                Create your first group
              </button>
            </li>
          )}
        </ul>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="g-name" className={labelClass}>Group name</label>
            <input id="g-name" name="name" className={fieldClass} placeholder="e.g. Flat 4 rent" maxLength={40} required autoFocus />
          </div>
          <div>
            <label htmlFor="g-purpose" className={labelClass}>What is the money for?</label>
            <input id="g-purpose" name="purpose" className={fieldClass} placeholder="e.g. Rent" maxLength={30} />
          </div>
          <div>
            <label htmlFor="g-required" className={labelClass}>Release rule</label>
            <select id="g-required" name="required" className={fieldClass} value={required} onChange={(e) => setRequired(e.target.value)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  Requires {n} {n === 1 ? "approval" : "approvals"}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">Money only leaves the pool when {required} {required === "1" ? "member approves" : "members approve"} the request.</p>
          </div>
          <button disabled={pending} className="h-12 w-full rounded-xl bg-brand-700 font-semibold text-white disabled:opacity-60">
            {pending ? "Creating…" : "Create group"}
          </button>
        </form>
      )}
    </>
  );
}
