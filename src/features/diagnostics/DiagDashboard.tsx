import { useAppRouter } from '#lib/router/index.js';
import React, { useState, Suspense, useMemo } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { useDiagnostics } from '#src/hooks/admin/useDiagnostics.js';
import { Button } from '#src/components/shared/Button.js';
import { LoadingScreen } from '#src/components/ui/LoadingScreen.js';
import { usePerformanceAudit } from '#src/hooks/admin/usePerformanceAudit.js';
import { useQueryState, parseAsString } from 'nuqs';

const ErrorLogViewer = React.lazy(() => import('./ErrorLogViewer.js').then(m => ({ default: m.ErrorLogViewer })));
const MaintenanceCenter = React.lazy(() => import('./MaintenanceCenter.js').then(m => ({ default: m.MaintenanceCenter })));
const TasksContent = React.lazy(() => import('./TasksList.js').then(m => ({ default: m.TasksContent })));
const StatisticsScreen = React.lazy(() => import('../statistics/components/StatisticsScreen.js').then(m => ({ default: m.StatisticsScreen })));

export function DiagDashboard() {
  const { navigate, route } = useAppRouter();
  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('stats'));
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  
  const activeTab = (() => {
    if (route?.name === 'adminTasks' || pathname.startsWith('/admin/tasks')) return 'tasks';
    if (route?.name === 'adminDiagnosticsLogs' || pathname.startsWith('/admin/error-logs')) return 'logs';
    return tab;
  })();

  const setActiveTab = (newTab: 'diagnosis' | 'tasks' | 'logs' | 'stats') => {
    if (newTab === 'tasks') {
      navigate.adminTasks();
    } else if (newTab === 'logs') {
      navigate.adminDiagnosticsLogs();
    } else {
      if (route?.name !== 'adminDiagnostics' && !pathname.startsWith('/admin/diagnose')) {
        navigate.adminDiagnostics();
      }
      setTab(newTab === 'stats' ? null : newTab);
    }
  };

  const { isPending, refreshReport, runAudit } = useDiagnostics();
  const isStandalone = pathname.startsWith('/diagnostics');

  return (
    <div className={isStandalone ? "h-screen overflow-y-auto w-full px-6 md:px-8 py-8 pb-32 no-scrollbar max-w-7xl mx-auto space-y-8 bg-slate-50 animate-in fade-in duration-500" : "space-y-8 animate-in fade-in duration-500"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isStandalone && (
            <button 
              onClick={() => navigate.admin()}
              className="p-2 mr-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"
              title="返回管理後台"
            >
              <Icon name="arrow-left" size={20} />
            </button>
          )}
          <Icon name="shield-check" className="w-8 h-8 text-brand-navy" />
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-brand-navy tracking-tight uppercase">系統維護中心</h1>
            <p className="text-xs text-slate-500 font-medium">SYSTEM MAINTENANCE & RECOVERY HUB</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
             {([
               { id: 'stats', label: '數據概覽 / Stats' },
               { id: 'diagnosis', label: '診斷與修復 / Repair' },
               { id: 'tasks', label: '任務佇列 / Tasks' },
               { id: 'logs', label: '系統日誌 / Logs' }
             ] as const).map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${
                   activeTab === tab.id 
                    ? 'bg-white text-brand-navy shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                 }`}
               >
                 {tab.label}
               </button>
             ))}
          </div>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              if (activeTab === 'diagnosis' || activeTab === 'stats') {
                refreshReport();
                runAudit();
              }
            }}
            loading={isPending}
            className="rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors h-9 w-9 shrink-0"
          >
            <Icon name="refresh-cw" size={16} className="text-slate-500" />
          </Button>
        </div>
      </div>

      {activeTab === 'stats' && (
        <div className="animate-in fade-in duration-500">
          <Suspense fallback={<LoadingScreen />}>
            <StatisticsScreen />
          </Suspense>
        </div>
      )}

      {activeTab === 'diagnosis' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <Suspense fallback={<LoadingScreen />}>
          <MaintenanceCenter 
            onSuccess={refreshReport} 
          />
          </Suspense>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
           <Suspense fallback={<LoadingScreen />}>
           <TasksContent />
           </Suspense>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
           <Suspense fallback={<LoadingScreen />}>
           <ErrorLogViewer />
           </Suspense>
        </div>
      )}
    </div>
  );
}
