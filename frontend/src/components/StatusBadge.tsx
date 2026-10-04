import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeStyle = (s: string) => {
    switch (s.toUpperCase()) {
      case 'SUCCESS':
      case 'ACTIVE':
      case 'RESOLVED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PENDING':
      case 'IN_PROGRESS':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'FAILED':
      case 'INACTIVE':
      case 'REVERSED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'OPEN':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'DEBIT':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'CREDIT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-700/20 text-slate-400 border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(
        status
      )}`}
    >
      {status}
    </span>
  );
};
