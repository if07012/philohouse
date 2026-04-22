import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { MysteryNav } from "./components/MysteryNav";

const font = Geist({
  subsets: ["latin"],
  variable: "--font-mystery",
});

export const metadata: Metadata = {
  title: "Mystery Reading — Baca & Petakan Misteri",
  description:
    "Aplikasi cerita misteri harian dan kuis pemahaman membaca untuk anak usia 10–12 tahun (Bahasa Indonesia).",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function MysteryReadingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${font.variable} min-h-dvh bg-slate-950 text-slate-100 antialiased font-sans pb-20`}
      style={{ fontFamily: "var(--font-mystery), system-ui, sans-serif" }}
    >
      {children}
      <MysteryNav />
    </div>
  );
}
