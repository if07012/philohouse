'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Collapse,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type {
  BillWithPayments,
  MemberBillWithDetails,
  MemberPaymentSummary,
  PaymentMethod,
} from '../lib/types';
import { formatCurrency, formatDate } from '../lib/formatUtils';
import { ResponsiveTable } from './ResponsiveTable';
import { usePanelWidth } from '../lib/useIsMobile';

const { Text } = Typography;

interface GroupedMemberBills {
  memberId: string;
  memberName: string;
  bills: MemberBillWithDetails[];
  totalOutstanding: number;
}

interface BillsSectionProps {
  initialBills: MemberBillWithDetails[];
  initialGrouped: GroupedMemberBills[];
  initialError?: string;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'QRIS', label: 'QRIS' },
];

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

function statusTag(status: string) {
  const color =
    status === 'PAID' ? 'green' : status === 'PARTIAL' ? 'orange' : 'red';
  return <Tag color={color}>{status}</Tag>;
}

function methodLabel(method: string): string {
  const found = PAYMENT_METHODS.find((m) => m.value === method);
  return found?.label || method;
}

interface PaymentFormValues {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: dayjs.Dayjs;
  note?: string;
}

function computeAllocations(
  bills: { id: string; gameDate: string; outstandingAmount: number }[],
  amount: number
) {
  const outstanding = bills
    .filter((b) => b.outstandingAmount > 0)
    .sort((a, b) => a.gameDate.localeCompare(b.gameDate));

  let remaining = amount;
  const allocations: {
    billId: string;
    gameDate: string;
    outstandingAmount: number;
    allocatedAmount: number;
  }[] = [];

  for (const bill of outstanding) {
    if (remaining <= 0) break;
    const allocatedAmount = Math.min(remaining, bill.outstandingAmount);
    if (allocatedAmount <= 0) continue;
    allocations.push({
      billId: bill.id,
      gameDate: bill.gameDate,
      outstandingAmount: bill.outstandingAmount,
      allocatedAmount,
    });
    remaining -= allocatedAmount;
  }

  return allocations;
}

export function BillsSection({
  initialBills,
  initialGrouped,
  initialError,
}: BillsSectionProps) {
  const [bills, setBills] = useState<MemberBillWithDetails[]>(initialBills);
  const [grouped, setGrouped] = useState<GroupedMemberBills[]>(initialGrouped);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillWithPayments | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm] = Form.useForm<PaymentFormValues>();

  const [memberPayOpen, setMemberPayOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberPaymentSummary | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberPaymentForm] = Form.useForm<PaymentFormValues>();
  const [previewAmount, setPreviewAmount] = useState<number>(0);
  const detailDrawerWidth = usePanelWidth(560);
  const memberDrawerWidth = usePanelWidth(600);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ grouped: 'true' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/badminton/bills?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBills(data.bills || []);
        setGrouped(data.grouped || []);
      } else {
        message.error(data.error || 'Gagal memuat tagihan');
      }
    } catch {
      message.error('Gagal memuat tagihan');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchBillDetail = useCallback(async (billId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/badminton/bills/${billId}`);
      const data = await res.json();
      if (data.success && data.bill) {
        setSelectedBill(data.bill);
        paymentForm.setFieldsValue({
          amount: data.bill.outstandingAmount,
          paymentMethod: 'TRANSFER',
          paymentDate: dayjs(),
          note: '',
        });
      } else {
        message.error(data.error || 'Gagal memuat detail tagihan');
      }
    } catch {
      message.error('Gagal memuat detail tagihan');
    } finally {
      setDetailLoading(false);
    }
  }, [paymentForm]);

  const openBillDetail = (bill: MemberBillWithDetails) => {
    setDetailOpen(true);
    setSelectedBill(null);
    fetchBillDetail(bill.id);
  };

  const fetchMemberSummary = useCallback(async (memberId: string) => {
    setMemberLoading(true);
    try {
      const res = await fetch(`/api/badminton/payments/member?memberId=${memberId}`);
      const data = await res.json();
      if (data.success && data.summary) {
        setSelectedMember(data.summary);
        memberPaymentForm.setFieldsValue({
          amount: data.summary.totalOutstanding,
          paymentMethod: 'TRANSFER',
          paymentDate: dayjs(),
          note: '',
        });
        setPreviewAmount(data.summary.totalOutstanding);
      } else {
        message.error(data.error || 'Gagal memuat tagihan member');
      }
    } catch {
      message.error('Gagal memuat tagihan member');
    } finally {
      setMemberLoading(false);
    }
  }, [memberPaymentForm]);

  const openMemberPayment = (group: GroupedMemberBills) => {
    setMemberPayOpen(true);
    setSelectedMember(null);
    fetchMemberSummary(group.memberId);
  };

  const handleMemberPayment = async (values: PaymentFormValues) => {
    if (!selectedMember) return;
    setMemberSubmitting(true);
    try {
      const res = await fetch('/api/badminton/payments/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember.memberId,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          paymentDate: values.paymentDate.toISOString(),
          note: values.note?.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const count = data.allocations?.length || data.payments?.length || 1;
        message.success(
          `Pembayaran ${formatCurrency(values.amount)} dicatat ke ${count} tagihan`
        );
        await fetchMemberSummary(selectedMember.memberId);
        await fetchBills();
      } else {
        message.error(data.error || 'Gagal mencatat pembayaran');
      }
    } catch {
      message.error('Gagal mencatat pembayaran');
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handlePayment = async (values: PaymentFormValues) => {
    if (!selectedBill) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/badminton/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberBillId: selectedBill.id,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          paymentDate: values.paymentDate.toISOString(),
          note: values.note?.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Pembayaran berhasil dicatat');
        await fetchBillDetail(selectedBill.id);
        await fetchBills();
      } else {
        message.error(data.error || 'Gagal mencatat pembayaran');
      }
    } catch {
      message.error('Gagal mencatat pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (initialError) message.error(initialError);
  }, [initialError]);

  const filteredGrouped = grouped.filter((g) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return g.memberName.toLowerCase().includes(q);
  });

  const billColumns: ColumnsType<MemberBillWithDetails> = [
    {
      title: 'Tanggal Main',
      key: 'gameDate',
      render: (_, r) => formatDateTime(r.gameDate),
    },
    { title: 'Lokasi', dataIndex: 'gameLocation', render: (v) => v || '-', responsive: ['md'] },
    {
      title: 'Biaya Hadir',
      dataIndex: 'attendanceFeeAmount',
      render: formatCurrency,
      responsive: ['lg'],
    },
    {
      title: 'Shuttlecock',
      dataIndex: 'shuttlecockFeeAmount',
      render: formatCurrency,
      responsive: ['lg'],
    },
    {
      title: 'Total Tagihan',
      dataIndex: 'billAmount',
      render: formatCurrency,
    },
    {
      title: 'Dibayar',
      dataIndex: 'paidAmount',
      render: (v) => (v > 0 ? formatCurrency(v) : '-'),
    },
    {
      title: 'Sisa',
      dataIndex: 'outstandingAmount',
      render: formatCurrency,
    },
    {
      title: 'Status',
      dataIndex: 'paymentStatus',
      render: statusTag,
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => openBillDetail(record)}>
          {record.paymentStatus === 'PAID' ? 'Detail' : 'Bayar'}
        </Button>
      ),
    },
  ];

  const collapseItems = filteredGrouped.map((group) => ({
    key: group.memberId,
    label: (
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2 min-w-0">
        <Text strong className="truncate">{group.memberName}</Text>
        <Text type="secondary" className="text-xs sm:text-sm">
          {group.bills.length} tagihan · Sisa {formatCurrency(group.totalOutstanding)}
        </Text>
      </div>
    ),
    extra:
      group.totalOutstanding > 0 ? (
        <Button
          type="primary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            openMemberPayment(group);
          }}
        >
          Bayar
        </Button>
      ) : undefined,
    children: (
      <ResponsiveTable
        rowKey="id"
        size="small"
        pagination={false}
        columns={billColumns}
        dataSource={group.bills}
        mobileTitleColumnKey="gameDate"
      />
    ),
  }));

  return (
    <>
      <Card title="Tagihan per Member">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div className="badminton-filters w-full">
            <Space wrap className="w-full">
              <Input.Search
                placeholder="Cari member..."
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-[240px]"
              />
              <Select
                allowClear
                placeholder="Filter status"
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-full sm:w-[160px]"
                options={[
                  { value: 'UNPAID', label: 'Unpaid' },
                  { value: 'PARTIAL', label: 'Partial' },
                  { value: 'PAID', label: 'Paid' },
                ]}
              />
              <Button onClick={() => fetchBills()} loading={loading}>
                Refresh
              </Button>
            </Space>
          </div>

          <Text type="secondary">
            Biaya hadir hanya dikenakan sekali per member per hari. Klik &quot;Bayar&quot; di
            header member untuk bayar sekaligus (otomatis dialokasikan ke tagihan terlama).
            Atau bayar per tagihan lewat tombol di tabel.
          </Text>

          {filteredGrouped.length === 0 ? (
            <Text type="secondary">Belum ada tagihan.</Text>
          ) : (
            <Collapse items={collapseItems} className="badminton-collapse-mobile" />
          )}

          <Card type="inner" title="Semua Tagihan" size="small">
            <ResponsiveTable
              rowKey="id"
              loading={loading}
              dataSource={bills.filter((b) => {
                const q = search.trim().toLowerCase();
                const matchSearch = !q || b.memberName.toLowerCase().includes(q);
                const matchStatus = !statusFilter || b.paymentStatus === statusFilter;
                return matchSearch && matchStatus;
              })}
              columns={[
                { title: 'Member', dataIndex: 'memberName', key: 'memberName' },
                {
                  title: 'Tanggal',
                  key: 'gameDate',
                  render: (_, r) => formatDateTime(r.gameDate),
                },
                {
                  title: 'Hadir',
                  dataIndex: 'attendanceFeeAmount',
                  render: (v) => (v > 0 ? formatCurrency(v) : '-'),
                  responsive: ['lg'],
                },
                {
                  title: 'Shuttlecock',
                  dataIndex: 'shuttlecockFeeAmount',
                  render: formatCurrency,
                  responsive: ['lg'],
                },
                {
                  title: 'Total',
                  dataIndex: 'billAmount',
                  render: formatCurrency,
                },
                {
                  title: 'Dibayar',
                  dataIndex: 'paidAmount',
                  render: (v) => (v > 0 ? formatCurrency(v) : '-'),
                  responsive: ['md'],
                },
                {
                  title: 'Status',
                  dataIndex: 'paymentStatus',
                  render: statusTag,
                },
                {
                  title: 'Aksi',
                  key: 'actions',
                  render: (_, record) => (
                    <Button type="link" size="small" onClick={() => openBillDetail(record)}>
                      {record.paymentStatus === 'PAID' ? 'Detail' : 'Bayar'}
                    </Button>
                  ),
                },
              ]}
              pagination={{ pageSize: 10 }}
              mobileTitleColumnKey="memberName"
            />
          </Card>
        </Space>
      </Card>

      <Drawer
        title="Detail Tagihan & Pembayaran"
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedBill(null);
          paymentForm.resetFields();
        }}
        width={detailDrawerWidth}
        loading={detailLoading}
      >
        {selectedBill && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Member">{selectedBill.memberName}</Descriptions.Item>
              <Descriptions.Item label="Tanggal Main">
                {formatDateTime(selectedBill.gameDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Lokasi">
                {selectedBill.gameLocation || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Biaya Hadir">
                {selectedBill.attendanceFeeAmount > 0
                  ? formatCurrency(selectedBill.attendanceFeeAmount)
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Shuttlecock">
                {formatCurrency(selectedBill.shuttlecockFeeAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Total Tagihan">
                {formatCurrency(selectedBill.billAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Sudah Dibayar">
                {formatCurrency(selectedBill.paidAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Sisa Tagihan">
                <Text type={selectedBill.outstandingAmount > 0 ? 'danger' : undefined}>
                  {formatCurrency(selectedBill.outstandingAmount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {statusTag(selectedBill.paymentStatus)}
              </Descriptions.Item>
            </Descriptions>

            {selectedBill.outstandingAmount > 0 && (
              <Card type="inner" title="Catat Pembayaran" size="small">
                <Form
                  form={paymentForm}
                  layout="vertical"
                  onFinish={handlePayment}
                  initialValues={{
                    paymentMethod: 'TRANSFER',
                    paymentDate: dayjs(),
                  }}
                >
                  <Form.Item
                    name="amount"
                    label="Nominal Dibayar"
                    rules={[
                      { required: true, message: 'Nominal wajib diisi' },
                      {
                        validator: (_, value) => {
                          if (value <= 0) return Promise.reject('Nominal harus lebih dari 0');
                          if (value > selectedBill.outstandingAmount) {
                            return Promise.reject(
                              `Maksimal ${formatCurrency(selectedBill.outstandingAmount)}`
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={selectedBill.outstandingAmount}
                      formatter={(v) =>
                        v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
                      }
                      parser={(v) => Number(v?.replace(/\./g, '') || 0)}
                      style={{ width: '100%' }}
                      addonBefore="Rp"
                    />
                  </Form.Item>
                  <Form.Item
                    name="paymentMethod"
                    label="Metode Pembayaran"
                    rules={[{ required: true, message: 'Metode wajib dipilih' }]}
                  >
                    <Select options={PAYMENT_METHODS} />
                  </Form.Item>
                  <Form.Item
                    name="paymentDate"
                    label="Tanggal Bayar"
                    rules={[{ required: true, message: 'Tanggal wajib diisi' }]}
                  >
                    <DatePicker showTime style={{ width: '100%' }} format="DD MMM YYYY HH:mm" />
                  </Form.Item>
                  <Form.Item name="note" label="Catatan (opsional)">
                    <Input.TextArea
                      rows={2}
                      placeholder="Contoh: Bayar via BCA, transfer dari Budi"
                      maxLength={200}
                      showCount
                    />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={submitting} block>
                    Simpan Pembayaran
                  </Button>
                </Form>
              </Card>
            )}

            <div>
              <Text strong>Riwayat Pembayaran</Text>
              {selectedBill.payments.length === 0 ? (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  Belum ada pembayaran.
                </Text>
              ) : (
                <div className="badminton-table-scroll mt-2">
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={selectedBill.payments}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      {
                        title: 'Tanggal',
                        dataIndex: 'paymentDate',
                        render: formatDateTime,
                      },
                      {
                        title: 'Nominal',
                        dataIndex: 'amount',
                        render: formatCurrency,
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
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          </Space>
        )}
      </Drawer>

      <Drawer
        title={
          selectedMember
            ? `Bayar — ${selectedMember.memberName}`
            : 'Bayar per Member'
        }
        open={memberPayOpen}
        onClose={() => {
          setMemberPayOpen(false);
          setSelectedMember(null);
          memberPaymentForm.resetFields();
          setPreviewAmount(0);
        }}
        width={memberDrawerWidth}
        loading={memberLoading}
      >
        {selectedMember && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Total Tagihan">
                {formatCurrency(selectedMember.totalBilled)}
              </Descriptions.Item>
              <Descriptions.Item label="Sudah Dibayar">
                {formatCurrency(selectedMember.totalPaid)}
              </Descriptions.Item>
              <Descriptions.Item label="Sisa Tagihan" span={2}>
                <Text type={selectedMember.totalOutstanding > 0 ? 'danger' : undefined} strong>
                  {formatCurrency(selectedMember.totalOutstanding)}
                </Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({selectedMember.bills.filter((b) => b.outstandingAmount > 0).length} tagihan
                  belum lunas)
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>Daftar Tagihan</Text>
              <div className="mt-2">
                <ResponsiveTable
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={selectedMember.bills}
                  mobileTitleColumnKey="gameDate"
                  columns={[
                    {
                      title: 'Tanggal Main',
                      key: 'gameDate',
                      dataIndex: 'gameDate',
                      render: formatDateTime,
                    },
                    {
                      title: 'Total',
                      dataIndex: 'billAmount',
                      render: formatCurrency,
                    },
                    {
                      title: 'Dibayar',
                      dataIndex: 'paidAmount',
                      render: (v) => (v > 0 ? formatCurrency(v) : '-'),
                      responsive: ['md'],
                    },
                    {
                      title: 'Sisa',
                      dataIndex: 'outstandingAmount',
                      render: formatCurrency,
                    },
                    {
                      title: 'Status',
                      dataIndex: 'paymentStatus',
                      render: statusTag,
                    },
                  ]}
                />
              </div>
            </div>

            {selectedMember.totalOutstanding > 0 && (
              <Card type="inner" title="Catat Pembayaran" size="small">
                <Form
                  form={memberPaymentForm}
                  layout="vertical"
                  onFinish={handleMemberPayment}
                  onValuesChange={(_, all) => {
                    if (typeof all.amount === 'number') setPreviewAmount(all.amount);
                  }}
                  initialValues={{
                    paymentMethod: 'TRANSFER',
                    paymentDate: dayjs(),
                  }}
                >
                  <Form.Item
                    name="amount"
                    label="Nominal Dibayar"
                    extra={`Maksimal ${formatCurrency(selectedMember.totalOutstanding)} — dialokasikan otomatis ke tagihan terlama`}
                    rules={[
                      { required: true, message: 'Nominal wajib diisi' },
                      {
                        validator: (_, value) => {
                          if (value <= 0) return Promise.reject('Nominal harus lebih dari 0');
                          if (value > selectedMember.totalOutstanding) {
                            return Promise.reject(
                              `Maksimal ${formatCurrency(selectedMember.totalOutstanding)}`
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={selectedMember.totalOutstanding}
                      formatter={(v) =>
                        v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
                      }
                      parser={(v) => Number(v?.replace(/\./g, '') || 0)}
                      style={{ width: '100%' }}
                      addonBefore="Rp"
                    />
                  </Form.Item>

                  {previewAmount > 0 && previewAmount <= selectedMember.totalOutstanding && (
                    <Card type="inner" size="small" title="Preview Alokasi" style={{ marginBottom: 16 }}>
                      <ResponsiveTable
                        rowKey="billId"
                        size="small"
                        pagination={false}
                        dataSource={computeAllocations(selectedMember.bills, previewAmount)}
                        mobileTitleColumnKey="gameDate"
                        columns={[
                          {
                            title: 'Tanggal Main',
                            key: 'gameDate',
                            dataIndex: 'gameDate',
                            render: formatDateTime,
                          },
                          {
                            title: 'Sisa Tagihan',
                            dataIndex: 'outstandingAmount',
                            render: formatCurrency,
                          },
                          {
                            title: 'Dialokasikan',
                            dataIndex: 'allocatedAmount',
                            render: (v) => <Text strong>{formatCurrency(v)}</Text>,
                          },
                        ]}
                      />
                    </Card>
                  )}

                  <Form.Item
                    name="paymentMethod"
                    label="Metode Pembayaran"
                    rules={[{ required: true, message: 'Metode wajib dipilih' }]}
                  >
                    <Select options={PAYMENT_METHODS} />
                  </Form.Item>
                  <Form.Item
                    name="paymentDate"
                    label="Tanggal Bayar"
                    rules={[{ required: true, message: 'Tanggal wajib diisi' }]}
                  >
                    <DatePicker showTime style={{ width: '100%' }} format="DD MMM YYYY HH:mm" />
                  </Form.Item>
                  <Form.Item name="note" label="Catatan (opsional)">
                    <Input.TextArea
                      rows={2}
                      placeholder="Contoh: Bayar 2 pertandingan sekaligus via transfer"
                      maxLength={200}
                      showCount
                    />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={memberSubmitting} block>
                    Simpan Pembayaran
                  </Button>
                </Form>
              </Card>
            )}

            <div>
              <Text strong>Riwayat Pembayaran</Text>
              {selectedMember.payments.length === 0 ? (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  Belum ada pembayaran.
                </Text>
              ) : (
                <div className="badminton-table-scroll mt-2">
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={selectedMember.payments}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      {
                        title: 'Tanggal',
                        dataIndex: 'paymentDate',
                        render: formatDateTime,
                        responsive: ['md'],
                      },
                      {
                        title: 'Tanggal Main',
                        dataIndex: 'gameDate',
                        render: formatDateTime,
                      },
                      {
                        title: 'Nominal',
                        dataIndex: 'amount',
                        render: formatCurrency,
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
                        responsive: ['lg'],
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          </Space>
        )}
      </Drawer>
    </>
  );
}
