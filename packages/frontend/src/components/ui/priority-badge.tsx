import * as React from 'react';
import { cn } from '@/lib/utils';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

const priorityConfig: Record<
  Priority,
  { label: string; className: string }
> = {
  critical: {
    label: 'Critical',
    className:
      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  high: {
    label: 'High',
    className:
      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  medium: {
    label: 'Medium',
    className:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  low: {
    label: 'Low',
    className:
      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
};

interface PriorityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority: Priority;
  showLabel?: boolean;
}

export function PriorityBadge({
  priority,
  showLabel = true,
  className,
  ...props
}: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
      {...props}
    >
      {showLabel ? config.label : priority}
    </span>
  );
}
