'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Row,
  Space,
  Statistic,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type {
  ExpenseCategory,
  ExpenseRecord,
  FinanceReport,
  IncomeCategory,
  IncomeLineItem,
} from '../lib/types';
import { formatCurrency, formatDate } from '../lib/formatUtils';
import { ResponsiveTable } from './ResponsiveTable';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SHUTTLECOCK: 'Pembelian Shuttlecock',
  COURT_RENT: 'Sewa Lapangan',
  TOURNAMENT: 'Turnamen',
  CONSUMPTION: 'Konsumsi',
  EQUIPMENT: 'Peralatan',
  OTHER: 'Lainnya',
};

const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  DONATION: 'Donasi',
  SPONSOR: 'Sponsor',
  TOURNAMENT: 'Turnamen',
  MEMBERSHIP: 'Iuran',
  OTHER: 'Lainnya',
};

function expenseCategoryLabel(category: ExpenseCategory | string): string {
  return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category;
}

function incomeCategoryLabel(category: IncomeCategory | string): string {
  return INCOME_CATEGORY_LABELS[category as IncomeCategory] || category;
}

function incomeSourceLabel(source: IncomeLineItem['source']): string {
  return source === 'MEMBER' ? 'Tagihan Member' : 'Manual';
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return formatDate(dateStr);
  }
}

function methodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Cash',
    TRANSFER: 'Transfer',
    QRIS: 'QRIS',
  };
  return labels[method] || method;
}

interface FinanceReportSectionProps {
  initialReport?: FinanceReport;
  initialError?: string;
  /** Refetch when tab becomes active (e.g. after recording manual income elsewhere) */
  isActive?: boolean;
}

export function FinanceReportSection({
  initialReport,
  initialError,
  isActive = true,
}: FinanceReportSectionProps) {
  const [report, setReport] = useState<FinanceReport | undefined>(initialReport);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.set('from', dateRange[0].format('YYYY-MM-DD'));
        params.set('to', dateRange[1].format('YYYY-MM-DD'));
      }

      const query = params.toString();
      const res = await fetch(`/api/badminton/finance${query ? `?${query}` : ''}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      } else {
        message.error(data.error || 'Gagal memuat laporan keuangan');
      }
    } catch {
      message.error('Gagal memuat laporan keuangan');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchReportRef = useRef(fetchReport);
  fetchReportRef.current = fetchReport;

  useEffect(() => {
    if (initialError) message.error(initialError);
  }, [initialError]);

  useEffect(() => {
    if (isActive) {
      fetchReportRef.current();
    }
  }, [isActive]);

  const incomeColumns: ColumnsType<IncomeLineItem> = [
    {
      title: 'Tanggal',
      dataIndex: 'date',
      key: 'date',
      render: formatDateTime,
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Sumber',
      dataIndex: 'source',
      key: 'source',
      render: incomeSourceLabel,
      responsive: ['md'],
    },
    {
      title: 'Keterangan',
      key: 'label',
      render: (_, record) =>
        record.source === 'MANUAL' && record.category
          ? `${record.label} (${incomeCategoryLabel(record.category)})`
          : record.label,
      ellipsis: true,
    },
    {
      title: 'Nominal',
      dataIndex: 'amount',
      render: formatCurrency,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Metode',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (v) => (v ? methodLabel(v) : '-'),
      responsive: ['md'],
    },
  ];

  const expenseColumns: ColumnsType<ExpenseRecord> = [
    {
      title: 'Tanggal',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: formatDateTime,
      sorter: (a, b) => a.transactionDate.localeCompare(b.transactionDate),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Kategori',
      dataIndex: 'category',
      render: expenseCategoryLabel,
    },
    {
      title: 'Nominal',
      dataIndex: 'amount',
      render: formatCurrency,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Keterangan',
      dataIndex: 'description',
      ellipsis: true,
      responsive: ['md'],
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size="middle" className="w-full">
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Laporan Keuangan
            </Title>
            <Text type="secondary">
              Rekap pendapatan, pengeluaran, dan saldo kas komunitas badminton
            </Text>
          </div>
          <Space wrap className="badminton-filters w-full">
            <RangePicker
              value={dateRange}
              onChange={(dates) =>
                setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
              }
              format="DD MMM YYYY"
              placeholder={['Dari', 'Sampai']}
              className="w-full sm:w-auto"
            />
            <Button onClick={fetchReport} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" onClick={fetchReport} loading={loading}>
              Terapkan Filter
            </Button>
          </Space>
        </Space>
      </Card>

      {report && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card size="small">
                <Statistic
                  title="Saldo Kas"
                  value={report.kpis.cashBalance}
                  formatter={(v) => formatCurrency(Number(v))}
                  valueStyle={{
                    color: report.kpis.cashBalance >= 0 ? '#3f8600' : '#cf1322',
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card size="small">
                <Statistic
                  title="Tagihan Belum Dibayar"
                  value={report.kpis.totalOutstanding}
                  formatter={(v) => formatCurrency(Number(v))}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card size="small">
                <Statistic
                  title="Pemasukan Bulan Ini"
                  value={report.kpis.revenueThisMonth}
                  formatter={(v) => formatCurrency(Number(v))}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card size="small">
                <Statistic
                  title="Pengeluaran Bulan Ini"
                  value={report.kpis.expensesThisMonth}
                  formatter={(v) => formatCurrency(Number(v))}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card size="small">
                <Statistic title="Total Permainan" value={report.kpis.totalGames} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card size="small">
                <Statistic title="Member Aktif" value={report.kpis.activeMembers} />
              </Card>
            </Col>
          </Row>

          <Card title="Laporan Kas" size="small">
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="Saldo Awal"
                  value={report.cashReport.openingBalance}
                  formatter={(v) => formatCurrency(Number(v))}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="Pembayaran Masuk"
                  value={report.cashReport.totalIncome}
                  formatter={(v) => formatCurrency(Number(v))}
                  valueStyle={{ color: '#3f8600' }}
                  prefix="+"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="Pengeluaran"
                  value={report.cashReport.totalExpenses}
                  formatter={(v) => formatCurrency(Number(v))}
                  valueStyle={{ color: '#cf1322' }}
                  prefix="-"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="Saldo Akhir"
                  value={report.cashReport.closingBalance}
                  formatter={(v) => formatCurrency(Number(v))}
                  valueStyle={{
                    color: report.cashReport.closingBalance >= 0 ? '#3f8600' : '#cf1322',
                  }}
                />
              </Col>
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            <Text type="secondary">
              {dateRange
                ? `Periode ${dateRange[0].format('DD MMM YYYY')} – ${dateRange[1].format('DD MMM YYYY')}`
                : 'Semua periode — saldo awal dihitung dari 0 jika tidak ada filter tanggal'}
            </Text>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                type="inner"
                title="Laporan Pemasukan"
                extra={
                  <Text type="secondary">
                    {(report.incomeLines?.length ?? 0)} transaksi ·{' '}
                    {formatCurrency(report.cashReport.totalIncome)}
                    {(report.incomeSummary?.totalTransactions ?? 0) > 0 && (
                      <> · {report.incomeSummary.totalTransactions} manual</>
                    )}
                  </Text>
                }
              >
                <ResponsiveTable
                  rowKey={(record) => `${record.source}-${record.id}`}
                  size="small"
                  loading={loading}
                  dataSource={report.incomeLines ?? []}
                  columns={incomeColumns}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  mobileTitleColumnKey="date"
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                type="inner"
                title="Laporan Pengeluaran"
                extra={
                  <Text type="secondary">
                    {report.expenseSummary.totalTransactions} transaksi ·{' '}
                    {formatCurrency(report.expenseSummary.totalExpenses)}
                  </Text>
                }
              >
                <ResponsiveTable
                  rowKey="id"
                  size="small"
                  loading={loading}
                  dataSource={report.expenses}
                  columns={expenseColumns}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  mobileTitleColumnKey="transactionDate"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Space>
  );
}
