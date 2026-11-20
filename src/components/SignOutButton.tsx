"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3.5 font-medium text-slate-700">
      <LogOut size={18} /> Sign out
    </button>
  );
}
