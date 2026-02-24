'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type TodoItem = { id: number; label: string };

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TodoPage() {
  const [dateKey, setDateKey] = useState(getTodayKey());
  const [items, setItems] = useState<TodoItem[]>([]);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const total = items.length;
  const doneCount = doneSet.size;
  const percent =
    total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const fetchTodos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/todo');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const { data, done } = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setDoneSet(new Set(Array.isArray(done) ? done : []));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Gagal memuat todo dari Google Sheet'
      );
      setItems([]);
      setDoneSet(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const toggle = async (id: number) => {
    const wasDone = doneSet.has(id);
    const willBeDone = !wasDone;

    // Optimistic update UI
    setDoneSet((prev) => {
      const next = new Set(prev);
      if (willBeDone) next.add(id);
      else next.delete(id);
      return next;
    });

    try {
      await fetch('/api/todo/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index: id,
          done: willBeDone,
          date: dateKey,
        }),
      });
    } catch (e) {
      console.error('Gagal update status todo:', e);
    }
  };

  const formatDisplayDate = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue mb-1 text-center">
          Todo List
        </h1>
        <p className="text-sm text-gray-500 mb-1 text-center">
          {dateKey ? formatDisplayDate(dateKey) : '...'}
        </p>
        <p className="text-xs text-gray-400 mb-4 text-center">
          Checklist per hari — besok daftar akan reset.
        </p>

        {total > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>
                Progress: {doneCount}/{total} selesai
              </span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-primary-pink transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {loading && (
          <p className="text-center text-gray-500 py-4">Memuat...</p>
        )}
        {error && (
          <p className="text-center text-red-600 py-2 text-sm">{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            Belum ada todo di sheet atau sheet kosong.
          </p>
        )}
        {!loading && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/80 transition"
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-md border-2 border-dark-blue flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-pink"
                  aria-label={
                    doneSet.has(item.id)
                      ? 'Batalkan centang'
                      : 'Tandai selesai'
                  }
                >
                  {doneSet.has(item.id) && (
                    <span className="text-primary-pink text-lg leading-none">
                      ✓
                    </span>
                  )}
                </button>
                <span
                  className={
                    doneSet.has(item.id)
                      ? 'text-gray-500 line-through flex-1'
                      : 'text-gray-800 flex-1'
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-center gap-3 mt-6">
          <Link
            href="/rules"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-300"
          >
            Aturan
          </Link>
          <Link
            href="/rules"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-pink px-6 py-3 text-sm font-semibold text-white shadow-md hover:opacity-90"
          >
            Kembali
          </Link>
        </div>
      </div>
    </div>
  );
}
