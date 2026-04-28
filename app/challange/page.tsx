import Image from "next/image";
import Link from "next/link";

export default function ChallangePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <Image
        src="/challange.jpg"
        alt="Challenge"
        fill
        priority
        className="object-cover"
      />

      <div className="absolute inset-x-0 top-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-6">
        <div className="mx-auto max-w-md">
          <Link
            href="/rules"
            className="inline-flex w-full items-center justify-center rounded-xl bg-white/95 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
          >
            Lihat Rules
          </Link>
        </div>
      </div>
    </main>
  );
}

