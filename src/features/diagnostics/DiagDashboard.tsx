import { useAppRouter } from '@/lib/router';
import React, { useState, Suspense, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useDiagnostics } from '@/hooks/admin/useDiagnostics';
import { Button } from '@/components/shared/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { usePerformanceAudit } from '@/hooks/admin/usePerformanceAudit';
import { useQueryState, parseAsString } from 'nuqs';

const ErrorLogViewer = React.lazy(() => import('./ErrorLogViewer').then(m => ({ default: m.ErrorLogViewer })));
const MaintenanceCenter = React.lazy(() => import('./MaintenanceCenter').then(m => ({ default: m.MaintenanceCenter })));
const TasksContent = React.lazy(() => import('./TasksList').then(m => ({ default: m.TasksContent })));
const StatisticsScreen = React.lazy(() => import('../statistics/components/StatisticsScreen').then(m => ({ default: m.StatisticsScreen })));

export function DiagDashboard() {
  const { navigate, route } = useAppRouter();
  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('stats'));
  
  const activeTab = (() => {
    if (route?.name === 'adminTasks') return 'tasks';
    if (route?.name === 'adminDiagnosticsLogs') return 'logs';
    return tab;
  })();

  const setActiveTab = (newTab: 'diagnosis' | 'tasks' | 'logs' | 'stats') => {
    if (newTab === 'tasks') {
      navigate.adminTasks();
    } else if (newTab === 'logs') {
      navigate.adminDiagnosticsLogs();
    } else {
      if (route?.name !== 'adminDiagnostics') {
        navigate.adminDiagnostics();
      }
      setTab(newTab === 'stats' ? null : newTab);
    }
  };

  const { isPending, refreshReport, runAudit } = useDiagnostics();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon name="shield-check" className="w-8 h-8 text-brand-navy" />
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-brand-navy tracking-tight uppercase">系統維護中心</h1>
            <p className="text-xs text-slate-500 font-medium">SYSTEM MAINTENANCE & RECOVERY HUB</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
             {[
               { id: 'stats', label: '數據概覽 / Stats' },
               { id: 'diagnosis', label: '診斷與修復 / Repair' },
               { id: 'tasks', label: '任務佇列 / Tasks' },
               { id: 'logs', label: '系統日誌 / Logs' }
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
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
