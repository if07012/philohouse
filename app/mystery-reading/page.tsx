"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const CHILD_KEY = "mystery_selected_child_id";

type MeChild = {
  child_id: string;
  nickname: string;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string;
  badges_json: string;
};

type MeResponse = {
  authenticated: boolean;
  familyId?: string;
  parentLabel?: string;
  children?: MeChild[];
};

type StorySummary = {
  story_date: string;
  title: string;
  summary: string;
  image_url: string;
};

export default function MysteryReadingHome() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/mystery-reading/me", { credentials: "include" });
      const j = (await r.json()) as MeResponse;
      setMe(j);
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(CHILD_KEY);
        if (stored && j.children?.some((c) => c.child_id === stored)) {
          setSelectedChild(stored);
        } else if (j.children?.length === 1) {
          setSelectedChild(j.children[0].child_id);
          localStorage.setItem(CHILD_KEY, j.children[0].child_id);
        }
      }
    } catch {
      setMe({ authenticated: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStoriesLoading(true);
      try {
        const r = await fetch("/api/mystery-reading/daily");
        const j = await r.json();
        if (!cancelled) {
          setStories(Array.isArray(j.stories) ? j.stories : []);
        }
      } catch {
        if (!cancelled) setStories([]);
      } finally {
        if (!cancelled) setStoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectChild = (id: string) => {
    setSelectedChild(id);
    localStorage.setItem(CHILD_KEY, id);
  };

  const child = me?.children?.find((c) => c.child_id === selectedChild);

  let badges: string[] = [];
  try {
    badges = child ? (JSON.parse(child.badges_json || "[]") as string[]) : [];
  } catch {
    badges = [];
  }

  return (
    <div className="pt-6 px-4 max-w-lg mx-auto">
      <header className="mb-8 text-center">
        <p className="text-amber-400/90 text-xs font-semibold uppercase tracking-widest mb-2">
          Mystery Reading
        </p>
        <h1 className="text-2xl font-bold text-white leading-tight">
          Pecahkan misteri lewat membaca
        </h1>
        <p className="mt-2 text-slate-400 text-sm">
          Pilih cerita dari perpustakaan di bawah. Tiap cerita punya kuis 10 soal — kumpulkan XP dan
          jaga streak!
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Cerita tersedia
        </h2>
        {storiesLoading ? (
          <p className="text-center text-slate-500 text-sm">Memuat daftar cerita…</p>
        ) : stories.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-center text-slate-500 text-sm">
            Belum ada cerita di perpustakaan. Tambahkan lewat generate (mis. panggil API{" "}
            <code className="text-amber-200/80 text-xs">/api/mystery-reading/daily/generate</code>{" "}
            dengan kunci yang dikonfigurasi).
          </p>
        ) : (
          <ul className="space-y-4">
            {stories.map((s) => {
              const enc = encodeURIComponent(s.story_date);
              const showImg = s.image_url?.startsWith("http");
              return (
                <li
                  key={s.story_date}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
                >
                  {showImg && (
                    <div className="relative aspect-[16/9] w-full border-b border-slate-800">
                      <img
                        src={s.image_url}
                        alt=""
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <p className="text-xs text-slate-500">{s.story_date}</p>
                    <h3 className="text-lg font-semibold text-white leading-snug">{s.title}</h3>
                    {s.summary ? (
                      <p className="text-slate-400 text-sm line-clamp-3">{s.summary}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Link
                        href={`/mystery-reading/story/${enc}`}
                        className="inline-flex flex-1 min-w-[100px] justify-center rounded-xl bg-amber-500/90 px-3 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
                      >
                        Baca
                      </Link>
                      <Link
                        href={`/mystery-reading/quiz/${enc}`}
                        className="inline-flex flex-1 min-w-[100px] justify-center rounded-xl border border-violet-500/50 px-3 py-2.5 text-sm font-semibold text-violet-200 hover:bg-violet-950/50"
                      >
                        Kuis
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {loading ? (
        <p className="text-center text-slate-500">Memuat profil…</p>
      ) : (
        <>
          {!me?.authenticated ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <p className="text-slate-300 text-sm">
                Masuk sebagai orang tua untuk simpan profil anak dan skor.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/mystery-reading/login"
                  className="inline-flex flex-1 min-w-[120px] justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400"
                >
                  Login
                </Link>
                <Link
                  href="/mystery-reading/register"
                  className="inline-flex flex-1 min-w-[120px] justify-center rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Daftar keluarga
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-xs text-slate-500">Keluarga</p>
                  <p className="font-medium text-slate-200">{me.parentLabel || "Orang tua"}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/mystery-reading/auth/logout", {
                      method: "POST",
                      credentials: "include",
                    });
                    localStorage.removeItem(CHILD_KEY);
                    void refresh();
                  }}
                  className="text-xs text-slate-500 hover:text-amber-300"
                >
                  Keluar
                </button>
              </div>

              {me.children && me.children.length > 0 ? (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Pilih anak (untuk simpan skor kuis)</p>
                  <div className="flex flex-wrap gap-2">
                    {me.children.map((c) => (
                      <button
                        key={c.child_id}
                        type="button"
                        onClick={() => selectChild(c.child_id)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          selectedChild === c.child_id
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {c.nickname}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-200/90">
                  Belum ada profil anak. Tambahkan di halaman{" "}
                  <Link href="/mystery-reading/parent" className="underline">
                    Orang tua
                  </Link>
                  .
                </p>
              )}

              {child && (
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-xl bg-slate-800/80 p-3">
                    <p className="text-amber-400 font-bold text-lg">{child.level}</p>
                    <p className="text-slate-500 text-xs">Level</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/80 p-3">
                    <p className="text-amber-400 font-bold text-lg">{child.xp}</p>
                    <p className="text-slate-500 text-xs">XP</p>
                  </div>
                  <div className="rounded-xl bg-slate-800/80 p-3">
                    <p className="text-amber-400 font-bold text-lg">{child.current_streak}</p>
                    <p className="text-slate-500 text-xs">Streak</p>
                  </div>
                </div>
              )}

              {badges.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Lencana</p>
                  <p className="text-sm text-slate-300">{badges.join(", ")}</p>
                </div>
              )}

              {!(me?.authenticated && selectedChild) && stories.length > 0 && (
                <p className="text-xs text-amber-200/70">
                  Tip: pilih profil anak agar hasil kuis tersimpan ke XP dan streak.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
