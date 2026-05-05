'use client';

import { useState } from 'react';

interface Task {
  id: string;
  name: string;
  targetTime: string;
  description?: string;
}

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  isCompleted: boolean;
}

export function TaskCard({ task, onComplete, isCompleted }: TaskCardProps) {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckIn = async () => {
    if (isCompleted) return;

    setIsChecking(true);
    try {
      const response = await fetch('/api/discipline/checkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.id,
          taskName: task.name,
          targetTime: task.targetTime,
          notes: isCompleted ? 'Already completed' : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onComplete(task.id);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to complete task');
    } finally {
      setIsChecking(false);
    }
  };

  const formatTimeDisplay = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hoursNum = parseInt(hours, 10);
    const ampm = hoursNum >= 12 ? 'PM' : 'AM';
    const displayHours = hoursNum % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
      <div className="flex justify-between items-start flex-col md:flex-row">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900">{task.name}</h3>
          <p className="text-gray-600 mt-1">
            Target: <span className="font-medium">{formatTimeDisplay(task.targetTime)}</span>
          </p>
          {task.description && (
            <p className="text-gray-500 text-sm mt-2">{task.description}</p>
          )}
        </div>
        <button
          onClick={handleCheckIn}
          disabled={isCompleted || isChecking}
          className={`px-6 py-2 rounded-lg font-medium transition w-full md:w-auto mt-4  ${
            isCompleted
              ? 'bg-green-500 text-white cursor-not-allowed'
              : isChecking
              ? 'bg-blue-400 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isCompleted ? 'Selesai' : isChecking ? 'Menyimpan...' : 'Selesai'}
        </button>
      </div>
    </div>
  );
}
