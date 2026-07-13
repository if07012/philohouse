"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const OrderButton = () => {
  return (
    <div className="flex items-center gap-4">
      <Link href="/order">
        <button className="px-6 py-3 bg-[#4a8c88] text-white rounded-xl text-lg font-semibold hover:bg-[#4a8c88] transition">
          Order Now — Fresh Today
        </button>
      </Link>
    </div>
  );
};

export default function Home() {
  return (
    <main className="relative bg-calm-cream min-h-screen overflow-hidden">

      <section className="fixed w-screen h-screen flex items-center">
        <HeroCarousel full />

        <div className="fixed z-20 bottom-4 right-4 md:bottom-6 md:right-6 flex flex-col items-end gap-2">
          <Link
            href="/quiz"
            className="rounded-full bg-[var(--color-dark-blue)]/95 text-white text-xs font-semibold px-4 py-2 border border-white/20 hover:opacity-90 transition shadow-lg"
          >
            Quiz
          </Link>
          <Link
            href="/mystery-reading"
            className="rounded-full bg-slate-900/90 text-amber-200 text-xs font-semibold px-4 py-2 border border-amber-500/40 hover:bg-slate-800 transition shadow-lg"
          >
            Mystery Reading
          </Link>
        </div>

        <div className="fixed z-10 md:w-1/2 space-y-6 animate-fade-in bg-[rgba(0,0,0,0.45)] backdrop-blur-md p-8 md:p-16 rounded-xl shadow-soft left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-start">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">
            Fresh, Small-Batch Cookies — Made for Smiles 🍪
          </h1>
          <p className="text-white/90 text-lg leading-relaxed max-w-xl md:h-auto hidden md:block">
            Handcrafted in small batches with premium ingredients and a lot of care.
            Whether it's a thoughtful gift or a daily treat, our cookies turn ordinary moments into delightful memories.
          </p>

          {true && <OrderButton />}
        </div>

      </section>
    </main>
  );
}

function HeroCarousel({ full = false }: { full?: boolean }) {
  const images = [
    "/cookies/cookies-hero.png",
    "/cookies/choco-chip.jpg",
    "/cookies/almond.jpg",
    "/cookies/matcha.jpg",
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={
      `relative w-full ${full ? 'h-screen' : 'h-[420px]'}`
    }>
      {images.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === index ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
        >
          <div className="absolute inset-0">
            <Image
              src={src}
              alt={`cookie-${i}`}
              fill
              className="object-cover object-center"
              priority={i === 0}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(51,78,88,0.06)]" />
        </div>
      ))}

      <div className="absolute left-3 bottom-3 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-3 h-3 rounded-full border-0 focus:outline-none ${i === index ? "bg-calm-teal" : "bg-white/70"
              }`}
            aria-label={`Show slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}