'use client';

import { useState } from 'react';
import { TaskCard } from './TaskCard';

interface TasksSectionProps {
  tasks: any;
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

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Daftar Tugas Harian</h2>
      <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.tasks.map((task: any) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={handleComplete}
            isCompleted={completedTasks.has(task.id)}
          />
        ))}
      </div>
    </section>
  );
}
