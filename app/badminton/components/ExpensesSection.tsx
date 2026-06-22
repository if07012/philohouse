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
import type { ExpenseCategory, ExpenseRecord, ExpenseSummary } from '../lib/types';
import { formatCurrency, formatDate } from '../lib/formatUtils';
import { ResponsiveTable } from './ResponsiveTable';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'SHUTTLECOCK', label: 'Pembelian Shuttlecock' },
  { value: 'COURT_RENT', label: 'Sewa Lapangan' },
  { value: 'TOURNAMENT', label: 'Turnamen' },
  { value: 'CONSUMPTION', label: 'Konsumsi' },
  { value: 'EQUIPMENT', label: 'Peralatan' },
  { value: 'OTHER', label: 'Lainnya' },
];

function categoryLabel(category: ExpenseCategory | string): string {
  const found = EXPENSE_CATEGORIES.find((c) => c.value === category);
  return found?.label || category;
}

interface ExpensesSectionProps {
  initialExpenses: ExpenseRecord[];
  initialSummary?: ExpenseSummary;
  initialError?: string;
}

interface ExpenseFormValues {
  transactionDate: dayjs.Dayjs;
  category: ExpenseCategory;
  description: string;
  amount: number;
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

export function ExpensesSection({
  initialExpenses,
  initialSummary,
  initialError,
}: ExpensesSectionProps) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses);
  const [summary, setSummary] = useState<ExpenseSummary | undefined>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | undefined>();
  const [form] = Form.useForm<ExpenseFormValues>();

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ summary: 'true' });
      if (dateRange) {
        params.set('from', dateRange[0].format('YYYY-MM-DD'));
        params.set('to', dateRange[1].format('YYYY-MM-DD'));
      }
      if (categoryFilter) params.set('category', categoryFilter);

      const res = await fetch(`/api/badminton/expenses?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
        setSummary(data.summary);
      } else {
        message.error(data.error || 'Gagal memuat pengeluaran');
      }
    } catch {
      message.error('Gagal memuat pengeluaran');
    } finally {
      setLoading(false);
    }
  }, [dateRange, categoryFilter]);

  const handleSubmit = async (values: ExpenseFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/badminton/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionDate: values.transactionDate.toISOString(),
          category: values.category,
          description: values.description.trim(),
          amount: values.amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Pengeluaran berhasil dicatat');
        form.resetFields();
        form.setFieldsValue({
          transactionDate: dayjs(),
          category: 'SHUTTLECOCK',
        });
        await fetchExpenses();
      } else {
        message.error(data.error || 'Gagal mencatat pengeluaran');
      }
    } catch {
      message.error('Gagal mencatat pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (initialError) message.error(initialError);
  }, [initialError]);

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
  ];

  const filteredExpenses = expenses.filter((e) => {
    if (categoryFilter && e.category !== categoryFilter) return false;
    return true;
  });

  return (
    <Card title="Pengeluaran">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card type="inner" title="Catat Pengeluaran Baru" size="small">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              transactionDate: dayjs(),
              category: 'SHUTTLECOCK',
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
                  <Select options={EXPENSE_CATEGORIES} />
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
                  name="description"
                  label="Keterangan"
                  rules={[{ required: true, message: 'Keterangan wajib diisi' }]}
                >
                  <Input placeholder="Contoh: Beli 1 dus shuttlecock" maxLength={200} />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Simpan Pengeluaran
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
            className="w-full sm:w-[220px]"
            options={EXPENSE_CATEGORIES}
          />
          <Button type="primary" onClick={fetchExpenses} loading={loading}>
            Terapkan Filter
          </Button>
        </Space>

        {summary && (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="Total Pengeluaran"
                    value={summary.totalExpenses}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Text type="secondary">{summary.totalTransactions} transaksi</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="Pengeluaran Bulan Ini"
                    value={summary.expensesThisMonth}
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
          <Title level={5}>Laporan Pengeluaran</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Daftar pengeluaran komunitas badminton.
          </Text>
          <ResponsiveTable
            rowKey="id"
            loading={loading}
            dataSource={filteredExpenses}
            columns={expenseColumns}
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
                </Table.Summary.Row>
              );
            }}
          />
        </div>
      </Space>
    </Card>
  );
}
