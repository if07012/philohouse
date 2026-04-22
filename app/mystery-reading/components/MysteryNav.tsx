"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/mystery-reading", label: "Beranda" },
  { href: "/mystery-reading/parent", label: "Orang tua" },
];

export function MysteryNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
        {links.map(({ href, label }) => {
          const active = pathname === href || (href !== "/mystery-reading" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
