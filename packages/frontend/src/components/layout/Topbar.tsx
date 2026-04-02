'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

function getLabel(segment: string) {
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500">
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span>/</span>}
            <span className={i === segments.length - 1 ? 'font-medium text-gray-900' : ''}>
              {getLabel(seg)}
            </span>
          </span>
        ))}
      </nav>

      {user && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}
    </header>
  );
}
