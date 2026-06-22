'use client';

import { useState } from 'react';
import { Tabs } from 'antd';
import { useIsMobile } from '../lib/useIsMobile';
import { MembersSection } from './MembersSection';
import { ConfigSection } from './ConfigSection';
import { GamesSection } from './GamesSection';
import { BillsSection } from './BillsSection';
import { FinanceReportSection } from './FinanceReportSection';
import { ExpensesSection } from './ExpensesSection';
import { IncomeSection } from './IncomeSection';
import type {
  GameWithDetails,
  MemberBillWithDetails,
  MemberWithSummary,
  ExpenseRecord,
  ExpenseSummary,
  IncomeRecord,
  IncomeSummary,
  FinanceReport,
  SystemConfiguration,
} from '../lib/types';

interface GroupedMemberBills {
  memberId: string;
  memberName: string;
  bills: MemberBillWithDetails[];
  totalOutstanding: number;
}

interface BadmintonTabsProps {
  members: MemberWithSummary[];
  membersError?: string;
  config: SystemConfiguration;
  configError?: string;
  games: GameWithDetails[];
  gamesError?: string;
  bills: MemberBillWithDetails[];
  groupedBills: GroupedMemberBills[];
  billsError?: string;
  financeReport?: FinanceReport;
  financeError?: string;
  expenses: ExpenseRecord[];
  expenseSummary?: ExpenseSummary;
  expensesError?: string;
  manualIncome: IncomeRecord[];
  incomeSummary?: IncomeSummary;
  incomeError?: string;
}

export function BadmintonTabs({
  members,
  membersError,
  config,
  configError,
  games,
  gamesError,
  bills,
  groupedBills,
  billsError,
  financeReport,
  financeError,
  expenses,
  expenseSummary,
  expensesError,
  manualIncome,
  incomeSummary,
  incomeError,
}: BadmintonTabsProps) {
  const [activeTab, setActiveTab] = useState('members');
  const activeMembers = members.filter((m) => m.isActive);
  const isMobile = useIsMobile();

  return (
    <Tabs
      className="badminton-tabs"
      activeKey={activeTab}
      onChange={setActiveTab}
      size={isMobile ? 'small' : 'middle'}
      tabBarGutter={isMobile ? 4 : 8}
      items={[
        {
          key: 'members',
          label: 'Master Member',
          children: (
            <MembersSection initialMembers={members} initialError={membersError} />
          ),
        },
        {
          key: 'games',
          label: 'Permainan',
          children: (
            <GamesSection
              initialGames={games}
              activeMembers={activeMembers}
              config={config}
              initialError={gamesError}
              onBillsGenerated={() => setActiveTab('bills')}
            />
          ),
        },
        {
          key: 'bills',
          label: 'Tagihan',
          children: (
            <BillsSection
              initialBills={bills}
              initialGrouped={groupedBills}
              initialError={billsError}
            />
          ),
        },
        {
          key: 'finance',
          label: 'Laporan Keuangan',
          children: (
            <FinanceReportSection
              initialReport={financeReport}
              initialError={financeError}
              isActive={activeTab === 'finance'}
            />
          ),
        },
        {
          key: 'income',
          label: 'Catat Pendapatan',
          children: (
            <IncomeSection
              initialIncome={manualIncome}
              initialSummary={incomeSummary}
              initialError={incomeError}
            />
          ),
        },
        {
          key: 'expenses',
          label: 'Catat Pengeluaran',
          children: (
            <ExpensesSection
              initialExpenses={expenses}
              initialSummary={expenseSummary}
              initialError={expensesError}
            />
          ),
        },
        {
          key: 'config',
          label: 'Konfigurasi',
          children: (
            <ConfigSection initialConfig={config} initialError={configError} />
          ),
        },
      ]}
    />
  );
}
