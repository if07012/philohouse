'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { PaymentWithDetails, RevenueSummary } from '../lib/types';
import { formatCurrency, formatDate } from '../lib/formatUtils';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface RevenueSectionProps {
  initialPayments: PaymentWithDetails[];
  initialSummary?: RevenueSummary;
  initialError?: string;
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

export function RevenueSection({
  initialPayments,
  initialSummary,
  initialError,
}: RevenueSectionProps) {
  const [payments, setPayments] = useState<PaymentWithDetails[]>(initialPayments);
  const [summary, setSummary] = useState<RevenueSummary | undefined>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [methodFilter, setMethodFilter] = useState<string | undefined>();

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ summary: 'true' });
      if (dateRange) {
        params.set('from', dateRange[0].format('YYYY-MM-DD'));
        params.set('to', dateRange[1].format('YYYY-MM-DD'));
      }
      if (methodFilter) params.set('method', methodFilter);

      const res = await fetch(`/api/badminton/payments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
        setSummary(data.summary);
      } else {
        message.error(data.error || 'Gagal memuat rekap pendapatan');
      }
    } catch {
      message.error('Gagal memuat rekap pendapatan');
    } finally {
      setLoading(false);
    }
  }, [dateRange, methodFilter]);

  useEffect(() => {
    if (initialError) message.error(initialError);
  }, [initialError]);

  const paymentColumns: ColumnsType<PaymentWithDetails> = [
    {
      title: 'Tanggal Bayar',
      dataIndex: 'paymentDate',
      render: formatDateTime,
      sorter: (a, b) => a.paymentDate.localeCompare(b.paymentDate),
      defaultSortOrder: 'descend',
    },
    { title: 'Member', dataIndex: 'memberName' },
    {
      title: 'Nominal',
      dataIndex: 'amount',
      render: formatCurrency,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Metode',
      dataIndex: 'paymentMethod',
      render: methodLabel,
    },
    {
      title: 'Catatan',
      dataIndex: 'note',
      render: (v) => v || '-',
      ellipsis: true,
    },
  ];

  const filteredPayments = payments.filter((p) => {
    if (methodFilter && p.paymentMethod !== methodFilter) return false;
    return true;
  });

  return (
    <Card title="Rekap Pendapatan">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) =>
              setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
            }
            format="DD MMM YYYY"
            placeholder={['Dari', 'Sampai']}
          />
          <Select
            allowClear
            placeholder="Filter metode"
            value={methodFilter}
            onChange={setMethodFilter}
            style={{ width: 160 }}
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'TRANSFER', label: 'Transfer' },
              { value: 'QRIS', label: 'QRIS' },
            ]}
          />
          <Button type="primary" onClick={fetchRevenue} loading={loading}>
            Terapkan Filter
          </Button>
        </Space>

        {summary && (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="Total Pendapatan"
                    value={summary.totalRevenue}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Text type="secondary">{summary.totalPayments} transaksi</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="Pendapatan Bulan Ini"
                    value={summary.revenueThisMonth}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Text type="secondary">{summary.paymentsThisMonth} transaksi</Text>
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card type="inner" title="Per Metode Pembayaran" size="small">
                  {summary.byMethod.length === 0 ? (
                    <Text type="secondary">Belum ada data.</Text>
                  ) : (
                    <Table
                      rowKey="method"
                      size="small"
                      pagination={false}
                      dataSource={summary.byMethod}
                      columns={[
                        {
                          title: 'Metode',
                          dataIndex: 'method',
                          render: methodLabel,
                        },
                        {
                          title: 'Total',
                          dataIndex: 'total',
                          render: formatCurrency,
                        },
                        { title: 'Jumlah', dataIndex: 'count' },
                      ]}
                    />
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card type="inner" title="Per Member" size="small">
                  {summary.byMember.length === 0 ? (
                    <Text type="secondary">Belum ada data.</Text>
                  ) : (
                    <Table
                      rowKey="memberId"
                      size="small"
                      pagination={false}
                      dataSource={summary.byMember}
                      columns={[
                        { title: 'Member', dataIndex: 'memberName' },
                        {
                          title: 'Total Bayar',
                          dataIndex: 'total',
                          render: formatCurrency,
                        },
                        { title: 'Transaksi', dataIndex: 'count' },
                      ]}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}

        <div>
          <Title level={5}>Laporan Pemasukan</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Daftar pembayaran yang benar-benar diterima — siap untuk dilaporkan.
          </Text>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={filteredPayments}
            columns={paymentColumns}
            pagination={{ pageSize: 15, showSizeChanger: true }}
            scroll={{ x: 700 }}
            summary={(pageData) => {
              const total = pageData.reduce((s, r) => s + r.amount, 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>Total halaman ini</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong>{formatCurrency(total)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={2} />
                </Table.Summary.Row>
              );
            }}
          />
        </div>
      </Space>
    </Card>
  );
}
