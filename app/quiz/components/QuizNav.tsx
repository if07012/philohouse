"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/quiz", label: "Daftar Quiz" },
  { href: "/quiz/history", label: "Riwayat" },
  { href: "/quiz/dashboard", label: "Dashboard" },
  { href: "/quiz/admin", label: "Admin" },
];

export function QuizNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-black/10 pb-4">
      {links.map((l) => {
        const active =
          l.href === "/quiz"
            ? pathname === "/quiz"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-[var(--color-dark-blue)] text-white"
                : "bg-black/5 text-black/70 hover:bg-black/10"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
