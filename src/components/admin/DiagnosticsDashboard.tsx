import React, { useState } from 'react';
import { 
  RefreshCw, PackageSearch, Zap, History, ShieldCheck
} from 'lucide-react';
import { useDiagnostics } from '@/hooks/admin/useDiagnostics';
import { DiagnosticCard } from './Diagnostics/DiagnosticCard';
import { TasksContent } from './Diagnostics/TasksList';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/useUIStore';
import { toast } from 'sonner';

import { usePerformanceAudit } from '@/hooks/admin/usePerformanceAudit';
import { ErrorLogViewer } from './ErrorLogViewer';
import { DiagnosticStats } from './Diagnostics/DiagnosticStats';
import { AuditVisualizer } from './Diagnostics/AuditVisualizer';
import { IssueList } from './Diagnostics/IssueList';
import { MaintenanceCenter } from './Diagnostics/MaintenanceCenter';

export function DiagnosticsDashboard() {
  const activeUIScreen = useUIStore(s => s.activeScreen);
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'tasks' | 'logs' | 'history'>('diagnosis');
  
  React.useEffect(() => {
    if (activeUIScreen === 'tasks') setActiveTab('tasks');
    if (activeUIScreen === 'error-logs' || activeUIScreen === 'logs') setActiveTab('logs');
    if (activeUIScreen === 'history_maintenance') setActiveTab('history');
    if (activeUIScreen === 'diagnostics') setActiveTab('diagnosis');
  }, [activeUIScreen]);

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
      toast.success('性能统计已重置 / Performance audit cleared');
      refreshReport();
      return;
    }
    await runRepair(issueId);
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
               { id: 'logs', label: '日志 / Logs' },
               { id: 'history', label: '历史 / History' }
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
            <DiagnosticCard 
              title="R2 存储及 CDN 连通性"
              desc="验证 Cloudflare R2 读写权限"
              icon={<PackageSearch size={16} />}
              onTest={runR2Diagnostics}
              isLoading={isDiagnosingR2}
              result={r2Result}
            />
            <DiagnosticCard 
              title="缩略图生成服务"
              desc="验证全局边缘 Worker 响应速度"
              icon={<Zap size={16} />}
              onTest={onTestWorker}
              isLoading={isLoading}
              result={localWorkerResult}
              successColor="text-brand-gold"
            />
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

      {activeTab === 'history' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
           <div className="bg-white border border-slate-100 rounded-[32px] p-8 text-center space-y-4">
              <History className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">维护历史已合并</h3>
                <p className="text-sm text-slate-500">所有的维护操作记录现在统一在「任务」选项卡中查看。</p>
              </div>
              <Button onClick={() => setActiveTab('tasks')} variant="outline" className="rounded-full">查看任务记录</Button>
           </div>
        </div>
      )}
    </div>
  );
}
