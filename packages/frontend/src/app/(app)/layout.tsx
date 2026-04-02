'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Bell,
  ChevronRight,
  ChevronLeft,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const breadcrumb = pathname.split('/').filter(Boolean).map((seg) =>
    seg.charAt(0).toUpperCase() + seg.slice(1)
  ).join(' / ');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar — hidden on sm, icon-only 64px on md, full 240px on lg+ ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 shrink-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-600">
                <FolderKanban className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold tracking-tight truncate">TaskFlow</span>
            </div>
          )}
          {collapsed && (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 mx-auto">
              <FolderKanban className="h-4 w-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
              collapsed && 'ml-auto mr-0'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0' : '',
                  active
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User block */}
        {!collapsed && (
          <div className="border-t border-border p-3">
            <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 uppercase dark:bg-brand-900/40 dark:text-brand-400">
                U
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="truncate text-sm font-medium">User</p>
                <p className="truncate text-xs text-muted-foreground">user@example.com</p>
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar — sticky with breadcrumb + user avatar */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/95 backdrop-blur px-6">
          <nav aria-label="Breadcrumb" className="text-sm font-medium text-muted-foreground">
            <span className="text-foreground">{breadcrumb || 'Dashboard'}</span>
          </nav>

          <div className="flex items-center gap-3">
            <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-600" />
            </button>
            {/* User avatar button */}
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 uppercase hover:ring-2 hover:ring-brand-600/50 transition-all dark:bg-brand-900/40 dark:text-brand-400">
              U
            </button>
          </div>
        </header>

        {/* Page content — scrollable */}
        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* ── Bottom nav — visible only on sm (<768px) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex h-16 items-center justify-around border-t border-border bg-card">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                active
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
