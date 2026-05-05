import { Suspense } from 'react';
import { getCurrentDateInJakarta } from './lib/timeUtils';
import { TasksSection } from '@/app/discipline/components/TasksSection';
import { CheckInsSection } from '@/app/discipline/components/CheckInsSection';
import Link from 'next/link';

/**
 * Discipline Tracker Main Page
 * Shows today's tasks and check-ins
 */
export default async function DisciplinePage() {
  const today = getCurrentDateInJakarta();

  // Fetch data in parallel
  const [tasksResult, checkInsResult] = await Promise.all([
    fetchTasks(),
    fetchCheckIns(today),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Discipline Tracker</h1>
          <p className="text-gray-600 mt-2">
            Tugas harian dan check-in kedisiplinan untuk anak
          </p>
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-blue-800">
              <strong>Hari ini:</strong> {formatDate(today)}
            </p>
          </div>
        </header>

        <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
          <TasksSection tasks={tasksResult} />
          <CheckInsSection checkIns={checkInsResult.checkIns} summary={checkInsResult.summary} />
        </Suspense>

        {/* Navigation */}
        <div className="mt-12 border-t pt-8">
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/discipline/history"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition"
            >
              <h3 className="font-semibold text-gray-900">History</h3>
              <p className="text-sm text-gray-600">Lihat riwayat check-in</p>
            </Link>
            <Link
              href="/discipline/parent"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition"
            >
              <h3 className="font-semibold text-gray-900">Untuk Orang Tua</h3>
              <p className="text-sm text-gray-600">Lihat laporan anak</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Fetch tasks from API
 */
async function fetchTasks() {
  try {
    const response = await fetch(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/discipline/tasks`, {
      cache: 'no-store',
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return { success: false, tasks: [] };
  }
}

/**
 * Fetch check-ins from API
 */
async function fetchCheckIns(date: string) {
  try {
    const response = await fetch(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/discipline/checkins?date=${date}`, {
      cache: 'no-store',
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return { success: false, checkIns: [], summary: defaultSummary() };
  }
}


/**
 * Helper: Format date to readable string
 */
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

/**
 * Helper: Get default summary
 */
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

export { formatDate };
