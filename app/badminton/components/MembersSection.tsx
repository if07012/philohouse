'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type {
  MemberWithSummary,
  AttendanceRecord,
  BillRecord,
  PaymentRecord,
} from '../lib/types';
import { ResponsiveTable } from './ResponsiveTable';
import { usePanelWidth } from '../lib/useIsMobile';

const { Title, Text } = Typography;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

interface MemberFormValues {
  name: string;
  phoneNumber: string;
  isActive: boolean;
  createdDate?: dayjs.Dayjs;
}

interface MembersSectionProps {
  initialMembers: MemberWithSummary[];
  initialError?: string;
}

export function MembersSection({ initialMembers, initialError }: MembersSectionProps) {
  const [members, setMembers] = useState<MemberWithSummary[]>(initialMembers);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithSummary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [addForm] = Form.useForm<MemberFormValues>();
  const [editForm] = Form.useForm<MemberFormValues>();
  const drawerWidth = usePanelWidth(640);

  const fetchMembers = useCallback(async (query = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      const res = await fetch(`/api/badminton/members?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMembers(data.members);
      } else {
        message.error(data.error || 'Gagal memuat daftar member');
      }
    } catch {
      message.error('Gagal memuat daftar member');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (initialError) {
      message.error(initialError);
    }
  }, [initialError]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phoneNumber.toLowerCase().includes(q)
    );
  }, [members, search]);

  const openDetail = async (member: MemberWithSummary) => {
    setSelectedMember(member);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/badminton/members/${member.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedMember(data.member);
        setAttendance(data.attendance || []);
        setBills(data.bills || []);
        setPayments(data.payments || []);
      } else {
        message.error(data.error || 'Gagal memuat detail member');
      }
    } catch {
      message.error('Gagal memuat detail member');
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (member: MemberWithSummary) => {
    setSelectedMember(member);
    editForm.setFieldsValue({
      name: member.name,
      phoneNumber: member.phoneNumber,
      isActive: member.isActive,
    });
    setEditOpen(true);
  };

  const handleAdd = async (values: MemberFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/badminton/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          phoneNumber: values.phoneNumber,
          isActive: values.isActive,
          createdDate: values.createdDate?.format('YYYY-MM-DD'),
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Member berhasil ditambahkan');
        setAddOpen(false);
        addForm.resetFields();
        await fetchMembers();
      } else {
        message.error(data.error || 'Gagal menambahkan member');
      }
    } catch {
      message.error('Gagal menambahkan member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: MemberFormValues) => {
    if (!selectedMember) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/badminton/members/${selectedMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          phoneNumber: values.phoneNumber,
          isActive: values.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Member berhasil diperbarui');
        setEditOpen(false);
        setSelectedMember(null);
        await fetchMembers();
      } else {
        message.error(data.error || 'Gagal memperbarui member');
      }
    } catch {
      message.error('Gagal memperbarui member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = (member: MemberWithSummary) => {
    Modal.confirm({
      title: 'Nonaktifkan Member',
      content: `Yakin ingin menonaktifkan "${member.name}"? Member nonaktif tidak akan muncul saat memilih pemain permainan.`,
      okText: 'Nonaktifkan',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: async () => {
        const res = await fetch(`/api/badminton/members/${member.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deactivate' }),
        });
        const data = await res.json();
        if (data.success) {
          message.success('Member berhasil dinonaktifkan');
          await fetchMembers();
        } else {
          message.error(data.error || 'Gagal menonaktifkan member');
        }
      },
    });
  };

  const columns: ColumnsType<MemberWithSummary> = [
    {
      title: 'Nama',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'id'),
    },
    {
      title: 'Nomor HP',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      responsive: ['md'],
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) =>
        active ? <Tag color="green">Aktif</Tag> : <Tag color="default">Nonaktif</Tag>,
      filters: [
        { text: 'Aktif', value: true },
        { text: 'Nonaktif', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: 'Tanggal Bergabung',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (date: string) => formatDate(date),
      responsive: ['lg'],
    },
    {
      title: 'Kehadiran',
      key: 'attendance',
      render: (_, record) => record.summary.attendanceCount,
      sorter: (a, b) => a.summary.attendanceCount - b.summary.attendanceCount,
      responsive: ['lg'],
    },
    {
      title: 'Total Tagihan',
      key: 'totalBills',
      render: (_, record) => formatCurrency(record.summary.totalBills),
      sorter: (a, b) => a.summary.totalBills - b.summary.totalBills,
    },
    {
      title: 'Total Pembayaran',
      key: 'totalPayments',
      render: (_, record) => formatCurrency(record.summary.totalPayments),
      sorter: (a, b) => a.summary.totalPayments - b.summary.totalPayments,
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            Detail
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          {record.isActive && (
            <Button type="link" size="small" danger onClick={() => handleDeactivate(record)}>
              Nonaktifkan
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        className="badminton-card-header-mobile"
        title="Master Member"
        extra={
          <Button type="primary" onClick={() => setAddOpen(true)}>
            Tambah Member
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input.Search
            placeholder="Cari nama atau nomor HP..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => fetchMembers()}
            className="w-full max-w-full sm:max-w-md"
          />

          <ResponsiveTable
            rowKey="id"
            columns={columns}
            dataSource={filteredMembers}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            mobileTitleColumnKey="name"
          />
        </Space>
      </Card>

      <Modal
        title="Tambah Member"
        open={addOpen}
        onCancel={() => {
          setAddOpen(false);
          addForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={addForm}
          layout="vertical"
          initialValues={{ isActive: true, createdDate: dayjs() }}
          onFinish={handleAdd}
        >
          <Form.Item
            name="name"
            label="Nama"
            rules={[{ required: true, message: 'Nama wajib diisi' }]}
          >
            <Input placeholder="Contoh: Budi Santoso" />
          </Form.Item>
          <Form.Item
            name="phoneNumber"
            label="Nomor HP"
            rules={[{ required: true, message: 'Nomor HP wajib diisi' }]}
          >
            <Input placeholder="Contoh: 08123456789" />
          </Form.Item>
          <Form.Item name="createdDate" label="Tanggal Bergabung">
            <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
          </Form.Item>
          <Form.Item name="isActive" label="Status Aktif" valuePropName="checked">
            <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Simpan
              </Button>
              <Button onClick={() => setAddOpen(false)}>Batal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Member"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setSelectedMember(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item
            name="name"
            label="Nama"
            rules={[{ required: true, message: 'Nama wajib diisi' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phoneNumber"
            label="Nomor HP"
            rules={[{ required: true, message: 'Nomor HP wajib diisi' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="isActive" label="Status Aktif" valuePropName="checked">
            <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Simpan
              </Button>
              <Button onClick={() => setEditOpen(false)}>Batal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={selectedMember ? `Detail: ${selectedMember.name}` : 'Detail Member'}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedMember(null);
        }}
        width={drawerWidth}
        styles={drawerWidth === '100%' ? { body: { paddingBottom: 24 } } : undefined}
        loading={detailLoading}
      >
        {selectedMember && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Nama">{selectedMember.name}</Descriptions.Item>
              <Descriptions.Item label="Nomor HP">{selectedMember.phoneNumber}</Descriptions.Item>
              <Descriptions.Item label="Status">
                {selectedMember.isActive ? (
                  <Tag color="green">Aktif</Tag>
                ) : (
                  <Tag color="default">Nonaktif</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tanggal Bergabung">
                {formatDate(selectedMember.createdDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Total Tagihan">
                {formatCurrency(selectedMember.summary.totalBills)}
              </Descriptions.Item>
              <Descriptions.Item label="Total Pembayaran">
                {formatCurrency(selectedMember.summary.totalPayments)}
              </Descriptions.Item>
              <Descriptions.Item label="Sisa Tagihan">
                {formatCurrency(selectedMember.summary.outstandingAmount)}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5}>Riwayat Kehadiran ({attendance.length})</Title>
              {attendance.length === 0 ? (
                <Text type="secondary">Belum ada riwayat kehadiran.</Text>
              ) : (
                <div className="badminton-table-scroll">
                  <Table
                    rowKey="gameId"
                    size="small"
                    pagination={false}
                    dataSource={attendance}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      { title: 'Tanggal', dataIndex: 'gameDate', render: formatDate },
                      { title: 'Lokasi', dataIndex: 'location', render: (v) => v || '-' },
                    ]}
                  />
                </div>
              )}
            </div>

            <div>
              <Title level={5}>Riwayat Tagihan ({bills.length})</Title>
              {bills.length === 0 ? (
                <Text type="secondary">Belum ada tagihan.</Text>
              ) : (
                <div className="badminton-table-scroll">
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={bills}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      { title: 'Tanggal', dataIndex: 'createdDate', render: formatDate },
                      {
                        title: 'Nominal',
                        dataIndex: 'billAmount',
                        render: formatCurrency,
                      },
                      {
                        title: 'Status',
                        dataIndex: 'paymentStatus',
                        render: (s: string) => {
                          const color =
                            s === 'PAID' ? 'green' : s === 'PARTIAL' ? 'orange' : 'red';
                          return <Tag color={color}>{s}</Tag>;
                        },
                      },
                    ]}
                  />
                </div>
              )}
            </div>

            <div>
              <Title level={5}>Riwayat Pembayaran ({payments.length})</Title>
              {payments.length === 0 ? (
                <Text type="secondary">Belum ada pembayaran.</Text>
              ) : (
                <div className="badminton-table-scroll">
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={payments}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      { title: 'Tanggal', dataIndex: 'paymentDate', render: formatDate },
                      { title: 'Nominal', dataIndex: 'amount', render: formatCurrency },
                      { title: 'Metode', dataIndex: 'paymentMethod' },
                      { title: 'Catatan', dataIndex: 'note', render: (v) => v || '-' },
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
