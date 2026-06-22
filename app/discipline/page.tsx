import { Suspense } from 'react';
import { getCurrentDateInJakarta } from './lib/timeUtils';
import { TasksSection } from '@/app/discipline/components/TasksSection';
import { CheckInsSection } from '@/app/discipline/components/CheckInsSection';
import Link from 'next/link';
import { Card, Row, Col, Button, Space } from 'antd';

export const dynamic = 'force-dynamic';

/**
 * Discipline Tracker Main Page
 * Shows today's tasks and check-ins
 */
export default async function DisciplinePage() {
  const today = getCurrentDateInJakarta();

  // Fetch data in parallel
  const [tasksResult, checkInsResult] = await Promise.all([
    fetchTasks(),
    fetchCheckIns(today),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Discipline Tracker</h1>
          <p className="text-sm text-gray-600">Tugas harian dan check-in kedisiplinan untuk anak</p>
        </div>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card type="inner" title={`Hari ini: ${formatDate(today)}`}>
            <p>Ringkasan kegiatan harian dan status check-in.</p>
          </Card>

          <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
            <Card bordered={false}>
              <TasksSection tasks={tasksResult} />
            </Card>

            <Card bordered={false}>
              <CheckInsSection checkIns={checkInsResult.checkIns} summary={checkInsResult.summary} />
            </Card>
          </Suspense>

          <div>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Link href="/discipline/history">
                  <Button block>History - Lihat riwayat check-in</Button>
                </Link>
              </Col>
              <Col xs={24} sm={12}>
                <Link href="/discipline/parent">
                  <Button block>Untuk Orang Tua - Lihat laporan anak</Button>
                </Link>
              </Col>
            </Row>
          </div>
        </Space>
      </div>
    </div>
  );
}

/**
 * Fetch tasks from API
 */
async function fetchTasks() {
  try {
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/discipline/tasks`, {
      cache: 'no-store',
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return { success: false, tasks: [] };
  }
}

/**
 * Fetch check-ins from API
 */
async function fetchCheckIns(date: string) {
  try {
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/discipline/checkins?date=${date}`, {
      cache: 'no-store',
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return { success: false, checkIns: [], summary: defaultSummary() };
  }
}


/**
 * Helper: Format date to readable string
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('id-ID', options);
}

/**
 * Helper: Get default summary
 */
function defaultSummary() {
  return {
    totalTasks: 0,
    onTimeCount: 0,
    lateCount: 0,
    ignoredCount: 0,
    totalDelayMinutes: 0,
    onTimePercentage: 0,
  };
}

export { formatDate };
