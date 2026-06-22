'use client';

import { useState } from 'react';
import { TaskCard } from './TaskCard';
import { getCurrentTimeInJakarta } from '../lib/timeUtils';

interface TasksSectionProps {
  tasks: any;
}

// Window in minutes around target time to consider "present" (2 hours default)
const MAX_WINDOW_MINUTES = 120;

function timeStrToMinutes(timeStr: string) {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return h * 60 + m;
}

export function TasksSection({ tasks }: TasksSectionProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const handleComplete = (taskId: string) => {
    setCompletedTasks((prev) => new Set(prev).add(taskId));
  };

  if (!tasks.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800">Gagal memuat daftar tugas</p>
      </div>
    );
  }

  if (tasks.tasks.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center mb-6">
        <p className="text-gray-600">Belum ada tugas harian</p>
      </div>
    );
  }

  // Determine current time in Jakarta (minutes since midnight)
  const now = getCurrentTimeInJakarta();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Group tasks
  const late: any[] = [];
  const present: any[] = [];
  const future: any[] = [];

  for (const task of tasks.tasks) {
    const target = timeStrToMinutes(task.targetTime || '00:00');
    const start = target - MAX_WINDOW_MINUTES;
    const end = target + MAX_WINDOW_MINUTES;

    if (end < nowMinutes) {
      late.push(task);
    } else if (start <= nowMinutes && nowMinutes <= end) {
      present.push(task);
    } else {
      future.push(task);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Daftar Tugas Harian</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Terlambat</h3>
          {late.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada tugas terlambat</p>
          ) : (
            <div className="space-y-4">
              {late.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  isCompleted={completedTasks.has(task.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Sedang Berlangsung</h3>
          {present.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada tugas saat ini</p>
          ) : (
            <div className="space-y-4">
              {present.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  isCompleted={completedTasks.has(task.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Mendatang</h3>
          {future.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada tugas mendatang</p>
          ) : (
            <div className="space-y-4">
              {future.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  isCompleted={completedTasks.has(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
