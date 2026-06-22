'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Form, InputNumber, Space, Typography, message } from 'antd';
import type { SystemConfiguration } from '../lib/types';
import { formatCurrency } from '../lib/formatUtils';

const { Text, Paragraph } = Typography;

interface ConfigFormValues {
  attendanceFee: number;
  defaultShuttlecockPrice: number;
}

interface ConfigSectionProps {
  initialConfig: SystemConfiguration;
  initialError?: string;
}

function currencyFormatter(value: number | string | undefined): string {
  if (value === undefined || value === '') return '';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
}

function currencyParser(value: string | undefined): number {
  if (!value) return 0;
  const parsed = value.replace(/Rp\s?|\./g, '').replace(/,/g, '');
  return Number(parsed) || 0;
}

export function ConfigSection({ initialConfig, initialError }: ConfigSectionProps) {
  const [config, setConfig] = useState<SystemConfiguration>(initialConfig);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<ConfigFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      attendanceFee: config.attendanceFee,
      defaultShuttlecockPrice: config.defaultShuttlecockPrice,
    });
  }, [config, form]);

  useEffect(() => {
    if (initialError) {
      message.error(initialError);
    }
  }, [initialError]);

  const handleSave = async (values: ConfigFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/badminton/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceFee: values.attendanceFee,
          defaultShuttlecockPrice: values.defaultShuttlecockPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        message.success('Konfigurasi berhasil disimpan');
      } else {
        message.error(data.error || 'Gagal menyimpan konfigurasi');
      }
    } catch {
      message.error('Gagal menyimpan konfigurasi');
    } finally {
      setSubmitting(false);
    }
  };

  const exampleBill =
    config.attendanceFee +
    Math.round(config.defaultShuttlecockPrice * 3 / 4);

  return (
    <Card title="Konfigurasi Sistem">
      <Paragraph type="secondary">
        Atur biaya kehadiran dan harga shuttlecock default. Nilai ini dipakai saat generate
        tagihan permainan.
      </Paragraph>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          attendanceFee: config.attendanceFee,
          defaultShuttlecockPrice: config.defaultShuttlecockPrice,
        }}
        style={{ maxWidth: 480 }}
      >
        <Form.Item
          name="attendanceFee"
          label="Biaya Kehadiran"
          rules={[
            { required: true, message: 'Biaya kehadiran wajib diisi' },
            {
              type: 'number',
              min: 1,
              message: 'Biaya kehadiran harus lebih dari 0',
            },
          ]}
          extra="Ditagihkan ke setiap pemain yang hadir main"
        >
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            step={1000}
            formatter={currencyFormatter}
            parser={currencyParser}
            placeholder="Contoh: Rp 25.000"
          />
        </Form.Item>

        <Form.Item
          name="defaultShuttlecockPrice"
          label="Harga Shuttlecock"
          rules={[
            { required: true, message: 'Harga shuttlecock wajib diisi' },
            {
              type: 'number',
              min: 1,
              message: 'Harga shuttlecock harus lebih dari 0',
            },
          ]}
          extra="Harga per shuttlecock, dibagi rata ke 4 pemain"
        >
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            step={1000}
            formatter={currencyFormatter}
            parser={currencyParser}
            placeholder="Contoh: Rp 18.000"
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Simpan Konfigurasi
            </Button>
            <Button
              onClick={() =>
                form.setFieldsValue({
                  attendanceFee: config.attendanceFee,
                  defaultShuttlecockPrice: config.defaultShuttlecockPrice,
                })
              }
            >
              Reset
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Card type="inner" title="Contoh Perhitungan Tagihan" style={{ marginTop: 24, maxWidth: 480 }}>
        <Space direction="vertical" size="small">
          <Text>
            Shuttlecock terpakai: <strong>3</strong> × {formatCurrency(config.defaultShuttlecockPrice)}{' '}
            = {formatCurrency(config.defaultShuttlecockPrice * 3)}
          </Text>
          <Text>
            Biaya shuttlecock per orang: {formatCurrency(config.defaultShuttlecockPrice * 3)} ÷ 4 ={' '}
            <strong>{formatCurrency(Math.round(config.defaultShuttlecockPrice * 3 / 4))}</strong>
          </Text>
          <Text>
            Biaya hadir: <strong>{formatCurrency(config.attendanceFee)}</strong>
          </Text>
          <Text>
            Total tagihan per member:{' '}
            <strong>{formatCurrency(exampleBill)}</strong>
          </Text>
        </Space>
      </Card>

      {config.updatedAt && (
        <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
          Terakhir diperbarui:{' '}
          {new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(config.updatedAt))}
        </Text>
      )}
    </Card>
  );
}
