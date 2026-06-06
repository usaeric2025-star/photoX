import React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminConsoleHeader } from '@/components/layouts/headers/AdminConsoleHeader';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';
import { PerformanceMonitor } from '@/components/admin/PerformanceMonitor';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AdminLayoutProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  totalCount?: number;
  onExit: () => void;
  title: string;
}

export function AdminLayout({
  children,
  onRefresh,
  isRefreshing,
  totalCount,
  onExit,
  title
}: AdminLayoutProps) {
  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50 overflow-hidden w-full">
        <div className="hidden lg:block shrink-0 h-full">
          <AdminSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          <AdminConsoleHeader 
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            totalCount={totalCount}
            onExit={onExit}
            title={title}
          />

          <main className="flex-1 relative overflow-hidden pb-16 sm:pb-0">
            {children}
          </main>

          <AdminMobileNav />
          <PerformanceMonitor />
        </div>
      </div>
    </ErrorBoundary>
  );
}
