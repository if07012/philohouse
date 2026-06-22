import { BadmintonNav } from '@/app/badminton/components/BadmintonNav';
import { FinanceReportSection } from '@/app/badminton/components/FinanceReportSection';
import type { FinanceReport } from '@/app/badminton/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Laporan Keuangan - Badminton Club',
  description: 'Rekap pendapatan, pengeluaran, dan saldo kas komunitas badminton',
};

export default async function BadmintonLaporanPage() {
  const result = await fetchFinanceReport();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-8">
        <BadmintonNav active="laporan" />
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Laporan Keuangan</h1>
          <p className="text-sm text-gray-600 mt-1">
            Rekap pendapatan, pengeluaran, dan saldo kas
          </p>
        </div>

        <FinanceReportSection
          initialReport={result.report}
          initialError={result.error}
        />
      </div>
    </div>
  );
}

async function fetchFinanceReport(): Promise<{
  report?: FinanceReport;
  error?: string;
}> {
  try {
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/badminton/finance`, {
      cache: 'no-store',
    });
    const data = await response.json();
    if (data.success) {
      return { report: data.report };
    }
    return { error: data.error || 'Gagal memuat laporan keuangan' };
  } catch (error) {
    console.error('Error fetching finance report:', error);
    return { error: 'Gagal memuat laporan keuangan' };
  }
}
