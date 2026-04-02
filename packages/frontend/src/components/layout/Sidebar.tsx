'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  HomeIcon,
  FolderIcon,
  Squares2X2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/projects', label: 'Projects', icon: FolderIcon },
  { href: '/board', label: 'Board', icon: Squares2X2Icon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-gray-200 bg-white transition-all duration-200',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        <div className="flex h-14 items-center justify-between px-3 border-b border-gray-200">
          {!collapsed && (
            <span className="text-base font-semibold text-gray-900">TaskFlow</span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto rounded p-1 text-gray-500 hover:bg-gray-100"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        <div className={cn('border-t border-gray-200 p-2', collapsed && 'flex justify-center')}>
          {!collapsed && user && (
            <div className="mb-2 px-2 py-1">
              <p className="truncate text-xs font-medium text-gray-900">{user.name}</p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => logout()}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full',
              collapsed && 'justify-center',
            )}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-gray-200 bg-white lg:hidden z-10">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium',
              pathname.startsWith(href) ? 'text-blue-700' : 'text-gray-500',
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
