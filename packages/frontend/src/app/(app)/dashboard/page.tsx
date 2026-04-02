'use client';

import { CheckCircle2, Clock, AlertCircle, FolderKanban, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const STAT_CARDS = [
  {
    title: 'Total Tasks',
    value: '48',
    delta: '+12 this week',
    icon: FolderKanban,
    iconClass: 'text-primary bg-primary/10',
  },
  {
    title: 'In Progress',
    value: '14',
    delta: '3 due today',
    icon: Clock,
    iconClass: 'text-[hsl(var(--status-in-progress))] bg-[hsl(var(--status-in-progress)/0.1)]',
  },
  {
    title: 'Completed',
    value: '27',
    delta: '+5 since yesterday',
    icon: CheckCircle2,
    iconClass: 'text-[hsl(var(--status-done))] bg-[hsl(var(--status-done)/0.1)]',
  },
  {
    title: 'Blocked',
    value: '7',
    delta: '2 need attention',
    icon: AlertCircle,
    iconClass: 'text-[hsl(var(--status-blocked))] bg-[hsl(var(--status-blocked)/0.1)]',
  },
];

const ACTIVITY = [
  {
    id: '1',
    user: 'Alice',
    action: 'moved',
    target: 'Design login screen',
    to: 'In Review',
    time: '2m ago',
    status: 'in_review' as const,
  },
  {
    id: '2',
    user: 'Bob',
    action: 'completed',
    target: 'Set up CI pipeline',
    to: 'Done',
    time: '18m ago',
    status: 'done' as const,
  },
  {
    id: '3',
    user: 'Carol',
    action: 'created',
    target: 'Add dark mode support',
    to: 'Backlog',
    time: '1h ago',
    status: 'backlog' as const,
  },
  {
    id: '4',
    user: 'Dave',
    action: 'flagged',
    target: 'API rate limit issue',
    to: 'Blocked',
    time: '2h ago',
    status: 'blocked' as const,
  },
  {
    id: '5',
    user: 'Alice',
    action: 'started',
    target: 'User profile page',
    to: 'In Progress',
    time: '3h ago',
    status: 'in_progress' as const,
  },
];

const STATUS_BADGE: Record<string, string> = {
  backlog: 'bg-[hsl(var(--status-backlog)/0.15)] text-[hsl(var(--status-backlog))]',
  todo: 'bg-[hsl(var(--status-todo)/0.15)] text-[hsl(var(--status-todo))]',
  in_progress: 'bg-[hsl(var(--status-in-progress)/0.15)] text-[hsl(var(--status-in-progress))]',
  in_review: 'bg-[hsl(var(--status-in-review)/0.15)] text-[hsl(var(--status-in-review))]',
  done: 'bg-[hsl(var(--status-done)/0.15)] text-[hsl(var(--status-done))]',
  blocked: 'bg-[hsl(var(--status-blocked)/0.15)] text-[hsl(var(--status-blocked))]',
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back — here's what's happening.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconClass}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {card.delta}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {ACTIVITY.map((item) => (
                <li key={item.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                    {item.user[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{item.user}</span>
                      {' '}
                      <span className="text-muted-foreground">{item.action}</span>
                      {' '}
                      <span className="font-medium">"{item.target}"</span>
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status] ?? ''}`}
                      >
                        {item.to}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Quick stats sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              { label: 'Backlog', count: 7, status: 'backlog', pct: 15 },
              { label: 'To Do', count: 13, status: 'todo', pct: 27 },
              { label: 'In Progress', count: 14, status: 'in_progress', pct: 29 },
              { label: 'In Review', count: 6, status: 'in_review', pct: 13 },
              { label: 'Done', count: 27, status: 'done', pct: 56 },
              { label: 'Blocked', count: 7, status: 'blocked', pct: 15 },
            ].map((row) => (
              <div key={row.status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--status-todo))]"
                    style={{
                      width: `${row.pct}%`,
                      backgroundColor: `hsl(var(--status-${row.status.replace('_', '-')}))`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
