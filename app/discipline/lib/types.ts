// Task types
export interface Task {
  id: string;
  name: string;
  targetTime: string; // HH:mm format
  description?: string;
}

// Check-in record
export interface CheckIn {
  id: string;
  taskId: string;
  taskName: string;
  targetTime: string; // HH:mm format
  completedAt: string; // ISO datetime
  delayMinutes: number;
  status: 'on_time' | 'late' | 'ignored';
  notes?: string;
  createdAt: string; // ISO datetime
}

// Check-in request payload
export interface CheckInRequest {
  taskId: string;
  taskName: string;
  targetTime: string;
  notes?: string;
}

// API response types
export interface GetTasksResponse {
  success: boolean;
  tasks: Task[];
}

export interface GetCheckInsResponse {
  success: boolean;
  checkIns: CheckIn[];
  summary?: CheckInSummary;
}

export interface CheckInSummary {
  totalTasks: number;
  onTimeCount: number;
  lateCount: number;
  ignoredCount: number;
  totalDelayMinutes: number;
  onTimePercentage: number;
}

// Daily summary
export interface DailySummary {
  date: string;
  checkIns: CheckIn[];
  summary: CheckInSummary;
}
