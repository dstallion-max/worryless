"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Users, User } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/envelopes", label: "Envelopes", Icon: Wallet },
  { href: "/groups", label: "Group", Icon: Users },
  { href: "/profile", label: "Profile", Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-medium ${
                  active ? "text-brand-700" : "text-slate-500"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 2} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
