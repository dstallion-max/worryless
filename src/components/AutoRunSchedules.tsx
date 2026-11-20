"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

/** Renders nothing. On page load it asks the server to run any overdue schedules, then refreshes the page data. */
export default function AutoRunSchedules() {
  const router = useRouter();
  const { toast } = useToast();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React dev mode runs effects twice
    started.current = true;

    fetch("/api/schedules/auto-run", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { due: number; paid: number; failed: number; messages: string[] } | null) => {
        if (!data || data.due === 0) return;
        if (data.paid > 0) toast(data.paid === 1 ? data.messages.find((m) => m.includes("sent") || m.includes("moved")) ?? "1 scheduled release ran." : `${data.paid} scheduled releases ran.`, "success");
        if (data.failed > 0) toast(`${data.failed} scheduled ${data.failed === 1 ? "release" : "releases"} failed. See your notifications.`, "error");
        router.refresh(); // show the new balances straight away
      })
      .catch(() => {
        /* offline: the next page load tries again */
      });
  }, [router, toast]);

  return null;
}
