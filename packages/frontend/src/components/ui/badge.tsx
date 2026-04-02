import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Status variants — use CSS custom property tokens
        'status-backlog':
          'border-transparent bg-[hsl(var(--status-backlog)/0.15)] text-[hsl(var(--status-backlog))]',
        'status-todo':
          'border-transparent bg-[hsl(var(--status-todo)/0.15)] text-[hsl(var(--status-todo))]',
        'status-in-progress':
          'border-transparent bg-[hsl(var(--status-in-progress)/0.15)] text-[hsl(var(--status-in-progress))]',
        'status-in-review':
          'border-transparent bg-[hsl(var(--status-in-review)/0.15)] text-[hsl(var(--status-in-review))]',
        'status-done':
          'border-transparent bg-[hsl(var(--status-done)/0.15)] text-[hsl(var(--status-done))]',
        'status-blocked':
          'border-transparent bg-[hsl(var(--status-blocked)/0.15)] text-[hsl(var(--status-blocked))]',
        'status-cancelled':
          'border-transparent bg-[hsl(var(--status-cancelled)/0.15)] text-[hsl(var(--status-cancelled))]',
        // Priority variants
        'priority-critical':
          'border-transparent bg-[hsl(var(--priority-critical)/0.15)] text-[hsl(var(--priority-critical))]',
        'priority-high':
          'border-transparent bg-[hsl(var(--priority-high)/0.15)] text-[hsl(var(--priority-high))]',
        'priority-medium':
          'border-transparent bg-[hsl(var(--priority-medium)/0.15)] text-[hsl(var(--priority-medium))]',
        'priority-low':
          'border-transparent bg-[hsl(var(--priority-low)/0.15)] text-[hsl(var(--priority-low))]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
