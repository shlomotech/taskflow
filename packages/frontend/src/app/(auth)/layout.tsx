import { FolderKanban } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand logo header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-md">
            <FolderKanban className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">TaskFlow</h1>
          <p className="text-sm text-muted-foreground">The task management tool your team will love</p>
        </div>

        {/* Centered card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
