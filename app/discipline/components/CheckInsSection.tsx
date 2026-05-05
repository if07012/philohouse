'use client';

import { CheckInCard } from './CheckInCard';
import { SummaryCard } from './SummaryCard';
import { formatDelayString } from '../lib/timeUtils';

interface CheckInsSectionProps {
  checkIns: any[];
  summary?: any;
}

export function CheckInsSection({ checkIns, summary }: CheckInsSectionProps) {
  if (!summary) return null;

  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Riwayat Check-in Hari Ini</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Tepat Waktu" value={summary.onTimeCount || 0} color="bg-green-500" />
        <SummaryCard label="Terlambat" value={summary.lateCount || 0} color="bg-orange-500" />
        <SummaryCard label="Tidak Valid" value={summary.ignoredCount || 0} color="bg-gray-500" />
        <SummaryCard label="Total" value={summary.totalTasks || 0} color="bg-blue-500" />
      </div>

      {checkIns.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Tugas Selesai</h3>
          {checkIns.map((checkIn: any) => (
            <CheckInCard key={checkIn.id} checkIn={checkIn} />
          ))}
        </div>
      ) : (
        <p className="text-gray-600">Belum ada check-in hari ini</p>
      )}

      <div className="mt-6 bg-gray-100 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Statistik</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Tingkat Ketepatan</p>
            <p className="text-xl font-bold text-gray-900">{summary.onTimePercentage}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Keterlambatan</p>
            <p className="text-xl font-bold text-gray-900">
              {formatDelayString(summary.totalDelayMinutes)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
