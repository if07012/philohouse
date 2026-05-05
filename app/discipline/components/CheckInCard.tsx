'use client';


interface CheckIn {
  id: string;
  taskName: string;
  targetTime: string;
  completedTime: string;
  delayMinutes: number;
  status: 'on_time' | 'late' | 'ignored';
  notes?: string;
}

interface CheckInCardProps {
  checkIn: CheckIn;
}

export function CheckInCard({ checkIn }: CheckInCardProps) {
  const statusColor =
    checkIn.status === 'on_time'
      ? 'bg-green-100 text-green-800'
      : checkIn.status === 'late'
      ? 'bg-orange-100 text-orange-800'
      : 'bg-gray-100 text-gray-800';

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    const hoursNum = parseInt(hours, 10);
    const ampm = hoursNum >= 12 ? 'PM' : 'AM';
    const displayHours = hoursNum % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  const formatDelayString = (minutes: number): string => {
    if (minutes <= 0) return 'Tepat Waktu';
    if (minutes < 60) return `${minutes} menit`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) return `${hours} jam`;
    return `${hours} jam ${remainingMinutes} menit`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
      <div>
        <p className="font-semibold text-gray-900">{checkIn.taskName}</p>
        <p className="text-sm text-gray-600">
          Target: {formatTimeDisplay(checkIn.targetTime)} | Selesai:{' '}
          {formatTimeDisplay(checkIn.completedTime)}
        </p>
        {checkIn.notes && <p className="text-sm text-gray-500 mt-1">{checkIn.notes}</p>}
        <p className="text-xs text-gray-500 mt-1">
          Keterlambatan: {formatDelayString(checkIn.delayMinutes)}
        </p>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          checkIn.status === 'on_time'
            ? 'bg-green-100 text-green-800'
            : checkIn.status === 'late'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {checkIn.status === 'on_time' ? 'Tepat Waktu' : checkIn.status === 'late' ? 'Terlambat' : 'Dihitung'}
      </span>
    </div>
  );
}
