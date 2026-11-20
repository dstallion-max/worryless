"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

/** Shows the ?ok= / ?error= message a server action redirected with, then cleans the URL. */
export default function FlashToast({ ok, error }: { ok?: string; error?: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ok && !error) return;
    toast((error ?? ok)!, error ? "error" : "success");
    router.replace(pathname, { scroll: false });
  }, [ok, error, pathname, router, toast]);

  return null;
}
