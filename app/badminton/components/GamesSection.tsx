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
  InputNumber,
  Modal,
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
  GameWithDetails,
  GameBillPreview,
  Member,
  SystemConfiguration,
} from '../lib/types';
import { formatCurrency } from '../lib/formatUtils';
import { ResponsiveTable } from './ResponsiveTable';
import { useIsMobile, usePanelWidth } from '../lib/useIsMobile';

const { Text, Title } = Typography;

interface CreateGameFormValues {
  gameDate: dayjs.Dayjs;
  location?: string;
  player1: string;
  player2: string;
  player3: string;
  player4: string;
}

interface GamesSectionProps {
  initialGames: GameWithDetails[];
  activeMembers: Member[];
  config: SystemConfiguration;
  initialError?: string;
  onBillsGenerated?: () => void;
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
    return dateStr;
  }
}

export function GamesSection({
  initialGames,
  activeMembers,
  config,
  initialError,
  onBillsGenerated,
}: GamesSectionProps) {
  const [games, setGames] = useState<GameWithDetails[]>(initialGames);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameWithDetails | null>(null);
  const [preview, setPreview] = useState<GameBillPreview | null>(null);
  const [shuttlecockUsed, setShuttlecockUsed] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm<CreateGameFormValues>();
  const isMobile = useIsMobile();
  const drawerWidth = usePanelWidth(560);
  const modalWidth = isMobile ? '100%' : 560;

  const memberOptions = useMemo(
    () =>
      activeMembers.map((m) => ({
        value: m.id,
        label: m.name,
      })),
    [activeMembers]
  );

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/badminton/games');
      const data = await res.json();
      if (data.success) {
        setGames(data.games);
      } else {
        message.error(data.error || 'Gagal memuat daftar permainan');
      }
    } catch {
      message.error('Gagal memuat daftar permainan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialError) {
      message.error(initialError);
    }
  }, [initialError]);

  const readyForBilling = useMemo(
    () =>
      games.filter(
        (g) =>
          g.status === 'ACTIVE' &&
          !g.billsGenerated &&
          g.players.length === 4 &&
          g.settlement
      ),
    [games]
  );

  const fetchPreview = useCallback(async (count: number, game: GameWithDetails) => {
    try {
      const res = await fetch(
        `/api/badminton/games/${game.id}?shuttlecockUsed=${count}`
      );
      const data = await res.json();
      if (data.success && data.preview) {
        setPreview(data.preview);
      }
    } catch {
      message.error('Gagal memuat preview tagihan');
    }
  }, []);

  const openSettle = (game: GameWithDetails) => {
    setSelectedGame(game);
    const initialCount = game.settlement?.shuttlecockUsed || 1;
    setShuttlecockUsed(initialCount);
    fetchPreview(initialCount, game);
    setSettleOpen(true);
  };

  const openDetail = (game: GameWithDetails) => {
    setSelectedGame(game);
    setDetailOpen(true);
  };

  const handleCreate = async (values: CreateGameFormValues) => {
    const playerIds = [values.player1, values.player2, values.player3, values.player4];
    const unique = new Set(playerIds);
    if (unique.size !== 4) {
      message.error('Keempat pemain harus berbeda');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/badminton/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameDate: values.gameDate.toISOString(),
          location: values.location?.trim(),
          playerIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Permainan berhasil dibuat');
        setCreateOpen(false);
        createForm.resetFields();
        await fetchGames();
      } else {
        message.error(data.error || 'Gagal membuat permainan');
      }
    } catch {
      message.error('Gagal membuat permainan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async () => {
    if (!selectedGame) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/badminton/games/${selectedGame.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shuttlecockUsed }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Permainan berhasil diselesaikan');
        setPreview(data.preview);
        setSelectedGame(data.game);
        await fetchGames();
      } else {
        message.error(data.error || 'Gagal menyelesaikan permainan');
      }
    } catch {
      message.error('Gagal menyelesaikan permainan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchGenerate = () => {
    Modal.confirm({
      title: 'Generate Tagihan Semua',
      content: (
        <div>
          <p>
            Generate tagihan untuk <strong>{readyForBilling.length}</strong> permainan yang
            sudah diselesaikan.
          </p>
          <p>Biaya hadir hanya sekali per member per hari.</p>
        </div>
      ),
      okText: 'Generate Tagihan',
      cancelText: 'Batal',
      onOk: async () => {
        const res = await fetch('/api/badminton/bills/generate', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          message.success(
            `${data.billsCreated} tagihan dibuat dari ${data.gamesProcessed} permainan`
          );
          await fetchGames();
          onBillsGenerated?.();
        } else {
          message.error(data.error || 'Gagal generate tagihan');
        }
      },
    });
  };

  const columns: ColumnsType<GameWithDetails> = [
    {
      title: 'Tanggal Main',
      dataIndex: 'gameDate',
      key: 'gameDate',
      render: formatDateTime,
      sorter: (a, b) => a.gameDate.localeCompare(b.gameDate),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Lokasi',
      dataIndex: 'location',
      key: 'location',
      render: (v: string) => v || '-',
      responsive: ['md'],
    },
    {
      title: 'Pemain',
      key: 'players',
      render: (_, record) => record.players.map((p) => p.memberName).join(', '),
    },
    {
      title: 'Shuttlecock',
      key: 'shuttlecock',
      render: (_, record) =>
        record.settlement ? record.settlement.shuttlecockUsed : '-',
      responsive: ['lg'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) =>
        status === 'FINISHED' ? (
          <Tag color="green">Selesai</Tag>
        ) : (
          <Tag color="blue">Aktif</Tag>
        ),
      filters: [
        { text: 'Aktif', value: 'ACTIVE' },
        { text: 'Selesai', value: 'FINISHED' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            Detail
          </Button>
          {record.status === 'ACTIVE' && !record.billsGenerated && (
            <Button type="link" size="small" onClick={() => openSettle(record)}>
              {record.settlement ? 'Edit Settlement' : 'Selesaikan'}
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
        title="Manajemen Permainan"
        extra={
          <Space>
            {readyForBilling.length > 0 && (
              <Button type="primary" ghost onClick={handleBatchGenerate}>
                Generate Tagihan ({readyForBilling.length})
              </Button>
            )}
            <Button
              type="primary"
              onClick={() => setCreateOpen(true)}
              disabled={activeMembers.length < 4}
            >
              Buat Permainan Baru
            </Button>
          </Space>
        }
      >
        {activeMembers.length < 4 && (
          <Text type="warning" style={{ display: 'block', marginBottom: 16 }}>
            Minimal 4 member aktif diperlukan untuk membuat permainan.
          </Text>
        )}

        <ResponsiveTable
          rowKey="id"
          columns={columns}
          dataSource={games}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          mobileTitleColumnKey="gameDate"
        />
      </Card>

      <Modal
        title="Buat Permainan Baru"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
        width={modalWidth}
        style={isMobile ? { top: 16, paddingBottom: 0 } : undefined}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ gameDate: dayjs() }}
        >
          <Form.Item
            name="gameDate"
            label="Tanggal Main"
            rules={[{ required: true, message: 'Tanggal main wajib diisi' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="DD MMM YYYY HH:mm"
            />
          </Form.Item>
          <Form.Item name="location" label="Lokasi (opsional)">
            <Input placeholder="Contoh: Gor ABC" />
          </Form.Item>

          <Title level={5}>Pemain (4 orang — double)</Title>
          {(['player1', 'player2', 'player3', 'player4'] as const).map((field, i) => (
            <Form.Item
              key={field}
              name={field}
              label={`Pemain ${i + 1}`}
              rules={[{ required: true, message: 'Pemain wajib dipilih' }]}
            >
              <Select
                placeholder="Pilih member"
                options={memberOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          ))}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Simpan Permainan
              </Button>
              <Button onClick={() => setCreateOpen(false)}>Batal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Selesaikan Permainan"
        open={settleOpen}
        onCancel={() => {
          setSettleOpen(false);
          setSelectedGame(null);
          setPreview(null);
        }}
        footer={null}
        destroyOnHidden
        width={modalWidth}
        style={isMobile ? { top: 16, paddingBottom: 0 } : undefined}
      >
        {selectedGame && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Tanggal">
                {formatDateTime(selectedGame.gameDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Pemain">
                {selectedGame.players.map((p) => p.memberName).join(', ')}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>Jumlah Shuttlecock Terpakai</Text>
              <InputNumber
                min={1}
                step={1}
                value={shuttlecockUsed}
                onChange={(v) => {
                  const count = v || 1;
                  setShuttlecockUsed(count);
                  if (selectedGame) fetchPreview(count, selectedGame);
                }}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>

            {preview && (
              <Card type="inner" title="Preview Perhitungan">
                <Space direction="vertical" size="small">
                  <Text>
                    {preview.shuttlecockUsed} × {formatCurrency(preview.shuttlecockPrice)} ={' '}
                    {formatCurrency(preview.totalShuttlecockCost)}
                  </Text>
                  <Text>
                    Biaya shuttlecock/orang: {formatCurrency(preview.shuttlecockPerPerson)}
                  </Text>
                  <Text type="secondary">
                    Biaya hadir ({formatCurrency(preview.attendanceFee)}) hanya sekali per hari
                  </Text>
                  <div className="badminton-table-scroll">
                    <Table
                      size="small"
                      pagination={false}
                      rowKey="memberId"
                      dataSource={preview.players}
                      scroll={{ x: 'max-content' }}
                      columns={[
                        { title: 'Member', dataIndex: 'memberName' },
                        {
                          title: 'Hadir',
                          dataIndex: 'attendanceFeeAmount',
                          render: (v: number) =>
                            v > 0 ? formatCurrency(v) : <Text type="secondary">—</Text>,
                        },
                        {
                          title: 'Shuttlecock',
                          dataIndex: 'shuttlecockFeeAmount',
                          render: formatCurrency,
                        },
                        {
                          title: 'Tagihan',
                          dataIndex: 'billAmount',
                          render: formatCurrency,
                        },
                      ]}
                    />
                  </div>
                </Space>
              </Card>
            )}

            <Space>
              <Button type="primary" onClick={handleSettle} loading={submitting}>
                Simpan Settlement
              </Button>
              <Button onClick={() => setSettleOpen(false)}>Tutup</Button>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Setelah semua permainan diselesaikan, gunakan tombol &quot;Generate Tagihan&quot; di
              halaman permainan untuk membuat tagihan sekaligus.
            </Text>
          </Space>
        )}
      </Modal>

      <Drawer
        title="Detail Permainan"
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedGame(null);
        }}
        width={drawerWidth}
      >
        {selectedGame && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Tanggal Main">
              {formatDateTime(selectedGame.gameDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Lokasi">
              {selectedGame.location || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {selectedGame.status === 'FINISHED' ? (
                <Tag color="green">Selesai</Tag>
              ) : (
                <Tag color="blue">Aktif</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Pemain">
              <Space direction="vertical" size={0}>
                {selectedGame.players.map((p) => (
                  <Text key={p.id}>{p.memberName}</Text>
                ))}
              </Space>
            </Descriptions.Item>
            {selectedGame.settlement && (
              <>
                <Descriptions.Item label="Shuttlecock Terpakai">
                  {selectedGame.settlement.shuttlecockUsed}
                </Descriptions.Item>
                <Descriptions.Item label="Harga Shuttlecock">
                  {formatCurrency(selectedGame.settlement.shuttlecockPrice)}
                </Descriptions.Item>
                <Descriptions.Item label="Biaya Shuttlecock/Orang">
                  {formatCurrency(selectedGame.settlement.shuttlecockPerPerson)}
                </Descriptions.Item>
                <Descriptions.Item label="Biaya Hadir">
                  {formatCurrency(selectedGame.settlement.attendanceFee)}
                </Descriptions.Item>
                <Descriptions.Item label="Total Tagihan/Member">
                  {formatCurrency(selectedGame.settlement.totalBillAmount)}
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="Tagihan Digenerate">
              {selectedGame.billsGenerated ? (
                <Tag color="green">Ya</Tag>
              ) : (
                <Tag>Belum</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
