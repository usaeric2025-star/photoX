import React, { useEffect } from 'react';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { ErrorLogViewer } from '@/components/admin/ErrorLogViewer';
import { usePhotoCount } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function PublicErrorLogPage() {
  const { data: count } = usePhotoCount({});
  const appLang = useUIStore((s) => s.appLang);

  useEffect(() => {
    document.title = appLang === 'zh' ? 'PhotoX | 系统日志' : 'PhotoX | System Logs';
  }, [appLang]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 overflow-y-auto" id="public-error-log-view">
      <PublicHeader 
        totalCount={count}
        onRefresh={async () => {}}
        isRefreshing={false}
      />
      
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">
              {appLang === 'zh' ? '系统日志' : 'System Logs'}
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              {appLang === 'zh' 
                ? '此页面提供开发调试与操作审计记录的第一手追踪。' 
                : 'This page provides first-hand tracing of development debugging and operational audit records.'}
            </p>
          </div>
          
          <ErrorBoundary>
            <ErrorLogViewer />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
