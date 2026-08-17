import React from 'react';

type StatusColorMap = Record<string, string>;

const defaultColorMap: StatusColorMap = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  LIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SUSPENDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DRAFT: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
  ONBOARDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DELETED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  INACTIVE: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
  INVITED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const tierColorMap: StatusColorMap = {
  FREE: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
  STARTER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PROFESSIONAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ENTERPRISE: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
};

const typeColorMap: StatusColorMap = {
  RESTAURANT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  LOUNGE: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  CLOUD_KITCHEN: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  QSR: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CAFE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  BAR: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

interface StatusBadgeProps {
  status: string;
  variant?: 'status' | 'tier' | 'type';
  className?: string;
}

export function StatusBadge({ status, variant = 'status', className = '' }: StatusBadgeProps) {
  const colorMap = variant === 'tier' ? tierColorMap : variant === 'type' ? typeColorMap : defaultColorMap;
  const colorClass = colorMap[status] ?? 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400';
  const label = status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
