'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
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
import type { IncomeCategory, IncomeRecord, IncomeSummary, PaymentMethod } from '../lib/types';
import { formatCurrency, formatDate } from '../lib/formatUtils';
import { ResponsiveTable } from './ResponsiveTable';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const INCOME_CATEGORIES: { value: IncomeCategory; label: string }[] = [
  { value: 'DONATION', label: 'Donasi' },
  { value: 'SPONSOR', label: 'Sponsor' },
  { value: 'TOURNAMENT', label: 'Turnamen' },
  { value: 'MEMBERSHIP', label: 'Iuran' },
  { value: 'OTHER', label: 'Lainnya' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'QRIS', label: 'QRIS' },
];

function categoryLabel(category: IncomeCategory | string): string {
  const found = INCOME_CATEGORIES.find((c) => c.value === category);
  return found?.label || category;
}

function methodLabel(method: string): string {
  const found = PAYMENT_METHODS.find((m) => m.value === method);
  return found?.label || method;
}

interface IncomeSectionProps {
  initialIncome: IncomeRecord[];
  initialSummary?: IncomeSummary;
  initialError?: string;
}

interface IncomeFormValues {
  transactionDate: dayjs.Dayjs;
  category: IncomeCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
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

export function IncomeSection({
  initialIncome,
  initialSummary,
  initialError,
}: IncomeSectionProps) {
  const [income, setIncome] = useState<IncomeRecord[]>(initialIncome);
  const [summary, setSummary] = useState<IncomeSummary | undefined>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<IncomeCategory | undefined>();
  const [form] = Form.useForm<IncomeFormValues>();

  const fetchIncome = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ summary: 'true' });
      if (dateRange) {
        params.set('from', dateRange[0].format('YYYY-MM-DD'));
        params.set('to', dateRange[1].format('YYYY-MM-DD'));
      }
      if (categoryFilter) params.set('category', categoryFilter);

      const res = await fetch(`/api/badminton/income?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setIncome(data.income || []);
        setSummary(data.summary);
      } else {
        message.error(data.error || 'Gagal memuat pendapatan');
      }
    } catch {
      message.error('Gagal memuat pendapatan');
    } finally {
      setLoading(false);
    }
  }, [dateRange, categoryFilter]);

  const handleSubmit = async (values: IncomeFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/badminton/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionDate: values.transactionDate.toISOString(),
          category: values.category,
          description: values.description.trim(),
          amount: values.amount,
          paymentMethod: values.paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Pendapatan berhasil dicatat');
        form.resetFields();
        form.setFieldsValue({
          transactionDate: dayjs(),
          category: 'OTHER',
          paymentMethod: 'TRANSFER',
        });
        await fetchIncome();
      } else {
        message.error(data.error || 'Gagal mencatat pendapatan');
      }
    } catch {
      message.error('Gagal mencatat pendapatan');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (initialError) message.error(initialError);
  }, [initialError]);

  const incomeColumns: ColumnsType<IncomeRecord> = [
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
      render: categoryLabel,
    },
    {
      title: 'Keterangan',
      dataIndex: 'description',
      ellipsis: true,
      responsive: ['md'],
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
      render: methodLabel,
      responsive: ['md'],
    },
  ];

  const filteredIncome = income.filter((item) => {
    if (categoryFilter && item.category !== categoryFilter) return false;
    return true;
  });

  return (
    <Card title="Pendapatan Manual">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card type="inner" title="Catat Pendapatan Baru" size="small">
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Untuk pembayaran tagihan member, gunakan tab Tagihan. Form ini untuk pendapatan
            di luar tagihan (donasi, sponsor, iuran khusus, dll).
          </Text>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              transactionDate: dayjs(),
              category: 'OTHER',
              paymentMethod: 'TRANSFER',
            }}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="transactionDate"
                  label="Tanggal"
                  rules={[{ required: true, message: 'Tanggal wajib diisi' }]}
                >
                  <DatePicker showTime style={{ width: '100%' }} format="DD MMM YYYY HH:mm" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="category"
                  label="Kategori"
                  rules={[{ required: true, message: 'Kategori wajib dipilih' }]}
                >
                  <Select options={INCOME_CATEGORIES} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="amount"
                  label="Nominal"
                  rules={[
                    { required: true, message: 'Nominal wajib diisi' },
                    {
                      validator: (_, value) =>
                        value > 0
                          ? Promise.resolve()
                          : Promise.reject('Nominal harus lebih dari 0'),
                    },
                  ]}
                >
                  <InputNumber
                    formatter={(v) =>
                      v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
                    }
                    parser={(v) => Number(String(v).replace(/\./g, '') || 0)}
                    style={{ width: '100%' }}
                    addonBefore="Rp"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="paymentMethod"
                  label="Metode"
                  rules={[{ required: true, message: 'Metode wajib dipilih' }]}
                >
                  <Select options={PAYMENT_METHODS} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  name="description"
                  label="Keterangan"
                  rules={[{ required: true, message: 'Keterangan wajib diisi' }]}
                >
                  <Input
                    placeholder="Contoh: Donasi dari sponsor ABC"
                    maxLength={200}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Simpan Pendapatan
            </Button>
          </Form>
        </Card>

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
          <Select
            allowClear
            placeholder="Filter kategori"
            value={categoryFilter}
            onChange={setCategoryFilter}
            className="w-full sm:w-[180px]"
            options={INCOME_CATEGORIES}
          />
          <Button type="primary" onClick={fetchIncome} loading={loading}>
            Terapkan Filter
          </Button>
        </Space>

        {summary && (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="Total Pendapatan Manual"
                    value={summary.totalIncome}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Text type="secondary">{summary.totalTransactions} transaksi</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="Pendapatan Manual Bulan Ini"
                    value={summary.incomeThisMonth}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Text type="secondary">{summary.transactionsThisMonth} transaksi</Text>
                </Card>
              </Col>
            </Row>

            <Card type="inner" title="Per Kategori" size="small">
              {summary.byCategory.length === 0 ? (
                <Text type="secondary">Belum ada data.</Text>
              ) : (
                <ResponsiveTable
                  rowKey="category"
                  size="small"
                  pagination={false}
                  dataSource={summary.byCategory}
                  mobileTitleColumnKey="category"
                  columns={[
                    {
                      title: 'Kategori',
                      key: 'category',
                      dataIndex: 'category',
                      render: categoryLabel,
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
          </>
        )}

        <div>
          <Title level={5}>Riwayat Pendapatan Manual</Title>
          <ResponsiveTable
            rowKey="id"
            loading={loading}
            dataSource={filteredIncome}
            columns={incomeColumns}
            pagination={{ pageSize: 15, showSizeChanger: true }}
            mobileTitleColumnKey="transactionDate"
            summary={(pageData) => {
              const total = pageData.reduce((s, r) => s + r.amount, 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Total halaman ini</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <Text strong>{formatCurrency(total)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} />
                </Table.Summary.Row>
              );
            }}
          />
        </div>
      </Space>
    </Card>
  );
}
