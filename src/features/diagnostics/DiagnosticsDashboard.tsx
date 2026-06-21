import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useState, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useDiagnostics } from '@/hooks/admin/useDiagnostics';
import { diagnosticRegistry, diagnosticCategories, type DiagnosticPlugin } from './registry';
import { DiagnosticCard } from './DiagnosticCard';
import { Button } from '@/components/shared/Button';
import { handleError } from '@/lib/error/errorHandler';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { usePerformanceAudit } from '@/hooks/admin/usePerformanceAudit';

const ErrorLogViewer = React.lazy(() => import('./ErrorLogViewer').then(m => ({ default: m.ErrorLogViewer })));
const DiagnosticStats = React.lazy(() => import('./DiagnosticStats').then(m => ({ default: m.DiagnosticStats })));
const AuditVisualizer = React.lazy(() => import('./AuditVisualizer').then(m => ({ default: m.AuditVisualizer })));
const IssueList = React.lazy(() => import('./IssueList').then(m => ({ default: m.IssueList })));
const MaintenanceCenter = React.lazy(() => import('./MaintenanceCenter').then(m => ({ default: m.MaintenanceCenter })));
const TasksContent = React.lazy(() => import('./TasksList').then(m => ({ default: m.TasksContent })));

interface PluginResult {
  result: { success: boolean; message: string; stage?: string; error?: string; latency?: number } | null;
  loading: boolean;
}

export function DiagnosticsDashboard() {
  const navigate = useRouterSafe().navigate;
  const location = useRouterSafe().location;
  
  const activeTab = (() => {
    const path = location.pathname;
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/error-logs')) return 'logs';
    return 'diagnosis';
  })();

  const setActiveTab = (tab: 'diagnosis' | 'tasks' | 'logs') => {
    switch (tab) {
      case 'tasks': navigate({ to: '/admin/tasks' }); break;
      case 'logs': navigate({ to: '/admin/error-logs' }); break;
      default: navigate({ to: '/admin/diagnose' }); break;
    }
  };

  const { 
    report, isPending, refreshReport, runRepair,
    runAudit, isAuditing, auditResult
  } = useDiagnostics();
  const { performanceIssues, clearAudits } = usePerformanceAudit();

  const internalRunRepair = async (issueId: string) => {
    if (issueId.startsWith('perf_')) {
      clearAudits();
      refreshReport();
      return;
    }
    await runRepair(issueId);
  };

  const [pluginResults, setPluginResults] = useState<Record<string, PluginResult>>({});

  const runPlugin = async (plugin: DiagnosticPlugin) => {
    setPluginResults(prev => ({ ...prev, [plugin.title]: { ...prev[plugin.title], loading: true } }));
    try {
      const res = await plugin.run();
      setPluginResults(prev => ({ ...prev, [plugin.title]: { result: res, loading: false } }));
      if (!res.success) {
        handleError(res, `[${plugin.title}] 检查未通过`);
      }
    } catch (e: unknown) {
      setPluginResults(prev => ({ ...prev, [plugin.title]: { result: { success: false, message: '执行出错', error: String(e) }, loading: false } }));
      handleError(e, `[${plugin.title}] 模块执行异常`);
    }
  };

  const combinedIssues = (() => {
    const list = [...(report?.issues || []), ...performanceIssues];
    const orphansCount = auditResult?.orphans?.count ?? 0;
    if (orphansCount > 0) {
      list.push({
        id: 'orphan_files',
        category: 'integrity',
        severity: 'P1',
        title: '云端存储包含孤儿物理文件 (Storage Orphans Found)',
        description: `Cloudflare R2 存储中存在 ${orphansCount} 个无数据库归档对账的物理图片文件。`,
        affectedCount: orphansCount,
        sampleIds: [],
        autoFixable: true
      });
    }
    return list;
  })();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon name="shield-check" className="w-8 h-8 text-brand-navy" />
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-brand-navy tracking-tight uppercase">系统诊断中心</h1>
            <p className="text-xs text-slate-500 font-medium">REAL-TIME SYSTEM DIAGNOSIS & RECOVERY ENGINE</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
             {[
               { id: 'diagnosis', label: '诊断 / Diagnosis' },
               { id: 'tasks', label: '任务 / Tasks' },
               { id: 'logs', label: '日志 / Logs' }
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as 'diagnosis' | 'tasks' | 'logs')}
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
              if (activeTab === 'diagnosis') {
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

      {activeTab === 'diagnosis' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <Suspense fallback={<LoadingScreen />}>
          <DiagnosticStats 
            report={report} 
            isPending={isPending} 
            onRefresh={() => { refreshReport(); runAudit(); }} 
          />
          </Suspense>

          <Suspense fallback={<LoadingScreen />}>
          <AuditVisualizer 
            auditResult={auditResult as any} 
            isAuditing={isAuditing} 
            onAudit={runAudit} 
          />
          </Suspense>

          {/* 基础设施诊断 - 按分类分组 */}
          {diagnosticCategories.map(category => {
            const plugins = diagnosticRegistry.filter(p => p.category === category.id);
            if (plugins.length === 0) return null;
            
            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-2 text-brand-navy font-bold">
                  {category.icon}
                  <h3>{category.title} ({plugins.length})</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {plugins.map(plugin => (
                    <DiagnosticCard 
                      key={plugin.title}
                      title={plugin.title}
                      desc={plugin.desc}
                      icon={plugin.icon}
                      isPending={pluginResults[plugin.title]?.loading ?? false}
                      result={pluginResults[plugin.title]?.result ?? null}
                      onTest={() => runPlugin(plugin)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <Suspense fallback={<LoadingScreen />}>
          <IssueList 
            issues={combinedIssues} 
            isPending={isPending} 
            onRepair={internalRunRepair} 
            onSuccess={() => { refreshReport(); runAudit(); }} 
          />
          </Suspense>

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
