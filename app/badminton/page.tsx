import { BadmintonTabs } from '@/app/badminton/components/BadmintonTabs';
import { BadmintonNav } from '@/app/badminton/components/BadmintonNav';
import { getDefaultConfiguration } from '@/app/badminton/lib/sheetHelpers';
import type {
  GameWithDetails,
  MemberBillWithDetails,
  MemberWithSummary,
  FinanceReport,
  ExpenseRecord,
  ExpenseSummary,
  IncomeRecord,
  IncomeSummary,
  SystemConfiguration,
} from '@/app/badminton/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Badminton Club Finance',
  description: 'Manajemen keuangan komunitas badminton',
};

export default async function BadmintonPage() {
  const [membersResult, configResult, gamesResult, billsResult, financeResult, expensesResult, incomeResult] =
    await Promise.all([
    fetchMembers(),
    fetchConfig(),
    fetchGames(),
    fetchBills(),
    fetchFinanceReport(),
    fetchExpenses(),
    fetchIncome(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
        <BadmintonNav active="main" />
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Badminton Club Finance
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manajemen keuangan komunitas badminton
          </p>
        </div>

        <BadmintonTabs
          members={membersResult.members}
          membersError={membersResult.error}
          config={configResult.config}
          configError={configResult.error}
          games={gamesResult.games}
          gamesError={gamesResult.error}
          bills={billsResult.bills}
          groupedBills={billsResult.grouped}
          billsError={billsResult.error}
          financeReport={financeResult.report}
          financeError={financeResult.error}
          expenses={expensesResult.expenses}
          expenseSummary={expensesResult.summary}
          expensesError={expensesResult.error}
          manualIncome={incomeResult.income}
          incomeSummary={incomeResult.summary}
          incomeError={incomeResult.error}
        />
      </div>
    </div>
  );
}

async function fetchMembers(): Promise<{
  members: MemberWithSummary[];
  error?: string;
}> {
  try {
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/badminton/members`, {
      cache: 'no-store',
    });
    const data = await response.json();
    if (data.success) {
      return { members: data.members };
    }
    return { members: [], error: data.error || 'Gagal memuat daftar member' };
  } catch (error) {
    console.error('Error fetching members:', error);
    return { members: [], error: 'Gagal memuat daftar member' };
  }
}

async function fetchConfig(): Promise<{
  config: SystemConfiguration;
  error?: string;
}> {
  try {
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/badminton/config`, {
      cache: 'no-store',
    });
    const data = await response.json();
    if (data.success) {
      return { config: data.config };
    }
    return {
      config: getDefaultConfiguration(),
      error: data.error || 'Gagal memuat konfigurasi',
    };
  } catch (error) {
    console.error('Error fetching config:', error);
    return {
      config: getDefaultConfiguration(),
      error: 'Gagal memuat konfigurasi',
    };
  }
}

async function fetchGames(): Promise<{
  games: GameWithDetails[];
  error?: string;
}> {
  try {
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/badminton/games`, {
      cache: 'no-store',
    });
    const data = await response.json();
    if (data.success) {
      return { games: data.games };
    }
    return { games: [], error: data.error || 'Gagal memuat daftar permainan' };
  } catch (error) {
    console.error('Error fetching games:', error);
    return { games: [], error: 'Gagal memuat daftar permainan' };
  }
}

async function fetchBills(): Promise<{
  bills: MemberBillWithDetails[];
  grouped: {
    memberId: string;
    memberName: string;
    bills: MemberBillWithDetails[];
    totalOutstanding: number;
  }[];
  error?: string;
}> {
  try {
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/badminton/bills?grouped=true`, {
      cache: 'no-store',
    });
    const data = await response.json();
    if (data.success) {
      return { bills: data.bills || [], grouped: data.grouped || [] };
    }
    return {
      bills: [],
      grouped: [],
      error: data.error || 'Gagal memuat tagihan',
    };
  } catch (error) {
    console.error('Error fetching bills:', error);
    return { bills: [], grouped: [], error: 'Gagal memuat tagihan' };
  }
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

async function fetchExpenses(): Promise<{
  expenses: ExpenseRecord[];
  summary?: ExpenseSummary;
  error?: string;
}> {
  try {
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/badminton/expenses?summary=true`, {
      cache: 'no-store',
    });
    const data = await response.json();
    if (data.success) {
      return { expenses: data.expenses || [], summary: data.summary };
    }
    return {
      expenses: [],
      error: data.error || 'Gagal memuat pengeluaran',
    };
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return { expenses: [], error: 'Gagal memuat pengeluaran' };
  }
}

async function fetchIncome(): Promise<{
  income: IncomeRecord[];
  summary?: IncomeSummary;
  error?: string;
}> {
  try {
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/badminton/income?summary=true`, {
      cache: 'no-store',
    });
    const data = await response.json();
    if (data.success) {
      return { income: data.income || [], summary: data.summary };
    }
    return {
      income: [],
      error: data.error || 'Gagal memuat pendapatan',
    };
  } catch (error) {
    console.error('Error fetching income:', error);
    return { income: [], error: 'Gagal memuat pendapatan' };
  }
}
