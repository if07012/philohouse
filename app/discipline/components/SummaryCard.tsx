'use client';

interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
}

export function SummaryCard({ label, value, color }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 text-center">
      <span className={`inline-block px-3 py-1 rounded-full text-white text-xs ${color}`}>
        {label}
      </span>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
