import { Suspense } from 'react';
import Link from 'next/link';
import { formatDelayString, formatDate, getCurrentDateInJakarta } from '../lib/timeUtils';

// Default summary for when no data is available
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

/**
 * Get date from query string or default to today
 */
function getFromDateParam(dateParam: string | null | undefined): string {
  if (dateParam) {
    // Validate date format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
  }
  // Fallback to today if invalid or not provided
  return getCurrentDateInJakarta();
}

/**
 * Parent Page - For parents to view child's discipline report
 */
export default async function DisciplineParentPage(
  { searchParams }: { searchParams: Promise<{ date?: string | null }> }
) {
  const params = await searchParams;
  const date = getFromDateParam(params?.date);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Laporan Anak</h1>
          <p className="text-gray-600 mt-2">Monitoring kedisiplinan anak Anda</p>
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
          <ParentView date={date} />
        </Suspense>
      </div>
    </div>
  );
}

async function getParentData(date: string) {
  try {
    const [tasksResponse, checkInsResponse] = await Promise.all([
      fetch(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/discipline/tasks`, {
        cache: 'no-store',
      }),
      fetch(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/discipline/checkins?date=${date}`, {
        cache: 'no-store',
      }),
    ]);

    const tasks = await tasksResponse.json();
    const checkIns = await checkInsResponse.json();

    return { tasks, checkIns };
  } catch (error) {
    console.error('Error fetching data:', error);
    return { tasks: { success: false, tasks: [] }, checkIns: { success: false, checkIns: [], summary: defaultSummary() } };
  }
}

async function ParentView({ date }: { date: string }) {
  const data = await getParentData(date);
  const today = getCurrentDateInJakarta();

  return (
    <div className="space-y-6">
      {/* Date Selector with Calendar */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Pilih Tanggal</h3>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/discipline/parent?date=${getPreviousDate(date)}`}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            title="Hari Sebelumnya"
          >
            ←
          </Link>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatDate(date)}
            </div>
            <div className="text-sm text-gray-500">
              {formatDateDiff(date, today)}
            </div>
          </div>
          <Link
            href={`/discipline/parent?date=${getNextDate(date)}`}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            title="Hari Berikutnya"
          >
            →
          </Link>
        </div>

        {/* Quick Navigation */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Link
            href={`/discipline/parent?date=${today}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Hari Ini
          </Link>
        </div>
      </div>

      {/* Today's Summary */}
      <ParentSummary data={data} />

      {/* Late Items */}
      <LateItems lateCheckIns={data.checkIns.checkIns || []} />

      {/* Checklist */}
      <ParentChecklist tasks={data.tasks.tasks} />
    </div>
  );
}

async function ParentSummary({ data }: { data: any }) {
  const summary = data.checkIns.summary || defaultSummary();

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-gray-50 p-4 border-b">
        <h2 className="font-semibold text-gray-900">
          Ringkasan {formatDate(data.checkIns.date || '')}
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {summary.onTimePercentage}%
            </div>
            <p className="text-gray-600">Ketepatan Waktu</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {summary.onTimeCount}
            </div>
            <p className="text-gray-600">Tugas Tepat Waktu</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">
              {summary.lateCount}
            </div>
            <p className="text-gray-600">Tugas Terlambat</p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Rata-rata keterlambatan:</span>
            <span className="font-semibold text-gray-900">
              {summary.totalDelayMinutes > 0 && summary.lateCount > 0
                ? formatDelayString(Math.round(summary.totalDelayMinutes / summary.lateCount))
                : '0 menit'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ParentChecklist({ tasks }: { tasks: any[] }) {
  if (tasks.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600">Data tugas belum tersedia</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-gray-50 p-4 border-b">
        <h2 className="font-semibold text-gray-900">Daftar Tugas</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {tasks.map((task: any) => (
          <div key={task.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">{task.name}</p>
              <p className="text-sm text-gray-600">
                Target: {formatTimeLocal(task.targetTime)}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-xs text-gray-500">Status:</div>
              <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                Belum Dicheck-in
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Late Items Component - Shows items where child was late
 */
function LateItems({ lateCheckIns }: { lateCheckIns: any[] }) {
  // Filter for late items
  const lateItems = lateCheckIns.filter((item: any) => item.status === 'late');

  if (lateItems.length === 0) {
    return (
      <div className="bg-green-50 rounded-lg p-6 text-center">
        <p className="text-green-800 font-medium">Semua tugas selesai tepat waktu hari ini!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-orange-50 p-4 border-b border-orange-100">
        <h2 className="font-semibold text-orange-900">
          ⚠️ Tugas Terlambat ({lateItems.length})
        </h2>
      </div>
      <div className="divide-y divide-gray-200">
        {lateItems.map((item: any, index: number) => (
          <div key={`${item.id}-${index}`} className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{item.taskName}</p>
                <p className="text-sm text-gray-600">
                  Target: {formatTimeLocal(item.targetTime)} | Selesai: {formatTimeLocal(item.completedTime || '')}
                </p>
              </div>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Terlambat {formatDelayString(item.delayMinutes)}
              </span>
            </div>
            {item.notes && <p className="text-xs text-gray-500 pl-2">{item.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimeLocal(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const hoursNum = parseInt(hours, 10);
  const ampm = hoursNum >= 12 ? 'PM' : 'AM';
  const displayHours = hoursNum % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

/**
 * Calculate previous date (YYYY-MM-DD)
 */
function getPreviousDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate next date (YYYY-MM-DD)
 */
function getNextDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date difference from today
 */
function formatDateDiff(date: string, today: string): string {
  const d1 = new Date(date + 'T00:00:00');
  const d2 = new Date(today + 'T00:00:00');

  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays === 2) return '2 hari lalu';
  if (diffDays < 7) return `${diffDays} hari lalu`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} bulan lalu`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} tahun lalu`;
}
