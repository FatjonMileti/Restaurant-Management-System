import React from 'react';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  preparing: 'bg-blue-500',
  completed: 'bg-green-600',
  cancelled: 'bg-red-500',
  confirmed: 'bg-green-600',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`${statusColors[status] || 'bg-gray-500'} text-white px-3 py-1 rounded-full inline-block text-sm capitalize ${className}`}>
      {status}
    </span>
  );
}
