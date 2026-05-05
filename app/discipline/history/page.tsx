import { Suspense } from 'react';
import Link from 'next/link';
import { CheckInCard } from '../components/CheckInCard';

/**
 * History Page - Shows all check-ins
 */
export default async function DisciplineHistoryPage() {
  const checkInsResult = await fetchCheckIns();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Riwayat Check-in</h1>
          <p className="text-gray-600 mt-2">Semua catatan check-in</p>
          <div className="mt-4">
            <Link
              href="/discipline"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <span className="mr-2">←</span>
              Kembali ke Home
            </Link>
          </div>
        </header>

        <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
          <CheckInsList checkIns={checkInsResult.checkIns} summary={checkInsResult.summary} />
        </Suspense>
      </div>
    </div>
  );
}

async function fetchCheckIns() {
  try {
    const response = await fetch(`${process.env.APP_BASE_URL || 'http://localhost:3000/'}api/discipline/checkins`, {
      cache: 'no-store',
    });
    const result = await response.json();
    return {
      checkIns: result.checkIns || [],
      summary: result.summary || defaultSummary(),
    };
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return { checkIns: [], summary: defaultSummary() };
  }
}

function CheckInsList({ checkIns, summary }: { checkIns: any[]; summary?: any }) {
  if (!summary) return null;

  // Group check-ins by date
  const byDate: Record<string, any[]> = {};
  checkIns.forEach((checkIn) => {
    const date = checkIn.createdAt?.split('T')[0] || checkIn.createdDate?.split('T')[0] || 'Unknown';
    if (!byDate[date]) {
      byDate[date] = [];
    }
    byDate[date].push(checkIn);
  });

  const sortedDates = Object.keys(byDate).sort().reverse();

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Ringkasan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryStat label="Total Check-in" value={summary.totalTasks || 0} />
          <SummaryStat label="Tepat Waktu" value={summary.onTimeCount || 0} />
          <SummaryStat label="Terlambat" value={summary.lateCount || 0} />
          <SummaryStat label="Keterlambatan Total" value={formatDelayString(summary.totalDelayMinutes)} />
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Tingkat Ketepatan</span>
            <span className="font-semibold">{summary.onTimePercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${summary.onTimePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Check-ins by Date */}
      {sortedDates.length === 0 ? (
        <p className="text-gray-600 text-center py-8">Belum ada riwayat check-in</p>
      ) : (
        sortedDates.map((date) => (
          <div key={date} className="bg-white rounded-lg shadow">
            <div className="bg-gray-50 p-4 border-b">
              <h3 className="font-semibold text-gray-900">{formatDate(date)}</h3>
            </div>
            <div className="p-4 space-y-3">
              {byDate[date].map((checkIn: any) => (
                <CheckInCard key={checkIn.id} checkIn={checkIn} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white p-3 rounded-lg border">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('id-ID', options);
}

function formatDelayString(minutes: number): string {
  if (minutes <= 0) return '0 menit';
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours} jam ${remaining} menit` : `${hours} jam`;
}

function defaultSummary() {
  return {
    totalTasks: 0,
    onTimeCount: 0,
    lateCount: 0,
    ignoredCount: 0,
    totalDelayMinutes: 0,
    onTimePercentage: 0,
  };
}
