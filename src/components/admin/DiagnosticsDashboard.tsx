import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useState } from 'react';
import { 
  RefreshCw, ShieldCheck
} from 'lucide-react';
import { useDiagnostics } from '@/hooks/admin/useDiagnostics';
import { diagnosticRegistry } from './Diagnostics/registry';
import { DiagnosticCard } from './Diagnostics/DiagnosticCard';
import { TasksContent } from './Diagnostics/TasksList';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/useUIStore';
import { showToast } from '@/lib/ui/toast';
import { handleError } from '@/lib/error/errorHandler';

import { usePerformanceAudit } from '@/hooks/admin/usePerformanceAudit';
import { ErrorLogViewer } from './ErrorLogViewer';
import { DiagnosticStats } from './Diagnostics/DiagnosticStats';
import { AuditVisualizer } from './Diagnostics/AuditVisualizer';
import { IssueList } from './Diagnostics/IssueList';
import { MaintenanceCenter } from './Diagnostics/MaintenanceCenter';

export function DiagnosticsDashboard() {
  const location = useRouterSafe().location;
  const navigate = useRouterSafe().navigate;
  
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
    report, isLoading, refreshReport, runRepair,
    runR2Diagnostics, isDiagnosingR2, r2Result,
    handleTestWorker, isTestingWorker: _unusedIsTesting, workerResult: _unusedResult,
    runAudit, isAuditing, auditResult
  } = useDiagnostics();
  const { performanceIssues, clearAudits } = usePerformanceAudit();

  const [localWorkerResult, setLocalWorkerResult] = useState<any>(null);

  const onTestWorker = async () => {
    const res = await handleTestWorker();
    if (res) setLocalWorkerResult(res);
  };

  const internalRunRepair = async (issueId: string) => {
    if (issueId.startsWith('perf_')) {
      clearAudits();
      showToast.success('性能统计已重置');
      refreshReport();
      return;
    }
    await runRepair(issueId);
  };

  const [pluginResults, setPluginResults] = useState<Record<string, { result: any, loading: boolean }>>({});

  const runPlugin = async (plugin: any) => {
    setPluginResults(prev => ({ ...prev, [plugin.title]: { ...prev[plugin.title], loading: true } }));
    try {
      const res = await plugin.run();
      setPluginResults(prev => ({ ...prev, [plugin.title]: { result: res, loading: false } }));
      if (!res.success) {
        handleError(res, `[${plugin.title}] 检查未通过`);
      } else {
        showToast.success(res.message);
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
        description: `Cloudflare R2 存储中存在 ${orphansCount} 个无数据库归档对账的物理图片文件（例如: ${auditResult?.orphans?.samples?.[0]?.key || ''}）。点击立即处理将自动扫描、生成智能描述与多语言配置并重建数据库归档。`,
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
          <ShieldCheck className="w-8 h-8 text-brand-navy" />
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
              if (activeTab === 'diagnosis') {
                refreshReport();
                runAudit();
              }
            }}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors h-9 w-9 flex items-center justify-center shrink-0"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-slate-500" : "text-slate-500"} />
          </Button>
        </div>
      </div>

      {activeTab === 'diagnosis' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* 核心指标统计 */}
          <DiagnosticStats 
            report={report} 
            isLoading={isLoading} 
            onRefresh={() => { refreshReport(); runAudit(); }} 
          />

          {/* R2 对账可视化 (P0) */}
          <AuditVisualizer 
            auditResult={auditResult} 
            isAuditing={isAuditing} 
            onAudit={runAudit} 
          />

          {/* 基础设施诊断 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {diagnosticRegistry.map(plugin => (
              <DiagnosticCard 
                key={plugin.title}
                title={plugin.title}
                desc={plugin.desc}
                icon={plugin.icon}
                isLoading={pluginResults[plugin.title]?.loading ?? false}
                result={pluginResults[plugin.title]?.result ?? null}
                onTest={() => runPlugin(plugin)}
              />
            ))}
          </div>

          {/* 智能故障修复列表 */}
          <IssueList 
            issues={combinedIssues} 
            isLoading={isLoading} 
            onRepair={internalRunRepair} 
            onSuccess={() => { refreshReport(); runAudit(); }} 
          />

          {/* 高级维护工具栏 */}
          <MaintenanceCenter 
            onSuccess={refreshReport} 
          />
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
           <TasksContent />
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
           <ErrorLogViewer />
        </div>
      )}
    </div>
  );
}
