import React, { useState } from 'react';
import { 
  RefreshCw, CheckCircle2, ShieldAlert, AlertTriangle, 
  Trash2, PackageSearch, CloudDownload, Zap, Fingerprint, History, ShieldCheck,
  Loader2, ChevronDown, Clock, Terminal, BarChart3, PackageSearch as PackageSearchIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDiagnostics } from '@/hooks/admin/useDiagnostics';
import { DiagnosticCard } from './Diagnostics/DiagnosticCard';
import { MaintenanceTool } from './Diagnostics/MaintenanceTool';
import { ISSUE_ACTIONS } from '@/lib/maintenance';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/useUIStore';
import { formatters } from '@/utils/formatters';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';

import { useGlobalTasks } from '@/hooks/admin/useGlobalTasks';
import { UnifiedTask } from '@/types';
import { usePerformanceAudit } from '@/hooks/admin/usePerformanceAudit';
import { ErrorLogViewer } from './ErrorLogViewer';

const severityColors = {
  P0: 'bg-red-50 text-red-600 border-red-100',
  P1: 'bg-orange-50 text-orange-600 border-orange-100',
  P2: 'bg-blue-50 text-blue-600 border-blue-100'
};

export function DiagnosticsDashboard() {
  const activeUIScreen = useUIStore(s => s.activeScreen);
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'tasks' | 'logs' | 'history'>('diagnosis');
  
  React.useEffect(() => {
    if (activeUIScreen === 'tasks') setActiveTab('tasks');
    if (activeUIScreen === 'error-logs' || activeUIScreen === 'logs') setActiveTab('logs');
    if (activeUIScreen === 'history_maintenance') setActiveTab('history');
    if (activeUIScreen === 'diagnostics') setActiveTab('diagnosis');
  }, [activeUIScreen]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const updateUIStore = useUIStore((s) => s.update);
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '异常记录 (P0)', value: report?.totalIssues || 0, color: 'text-red-600' },
          { label: '重要发现 (P1/P2)', value: (report?.issuesBySeverity.P1 || 0) + (report?.issuesBySeverity.P2 || 0), color: 'text-slate-900' },
          { label: '最后扫描', value: report?.timestamp ? formatters.dateTime(report.timestamp) : '-', color: 'text-slate-500 font-mono' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between h-24">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-1 tracking-tight ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
        <button 
          onClick={() => {
            refreshReport();
            runAudit();
          }}
          disabled={isLoading}
          className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center gap-1 group active:scale-95 transition-all disabled:opacity-50 h-24 justify-center"
        >
          <RefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          <span className="text-xs font-semibold mt-1">全域扫描</span>
        </button>
      </div>

      {/* R2 对账可视化 (P0) */}
      <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
          <PackageSearch size={120} />
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <PackageSearch size={18} className="text-blue-500" />
              R2 云端对账审计报告
            </h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Consistency Audit between R2 Storage and Database</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runAudit} 
            disabled={isAuditing}
            className="text-xs font-medium h-8 px-4 rounded-xl text-slate-700 hover:bg-slate-50"
          >
            {isAuditing ? <Loader2 size={12} className="animate-spin mr-1.5" /> : null}
            重新审计
          </Button>
        </div>

        {auditResult ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 可视化条形图 */}
            {(() => {
              const healthy = auditResult?.healthyCount ?? 0;
              const orphans = auditResult?.orphans?.count ?? 0;
              const ghosts = auditResult?.ghosts?.count ?? 0;
              const total = healthy + orphans + ghosts;
              const getWidth = (val: number) => total > 0 ? (val / total) * 100 : 0;
              return (
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-green-500 transition-all duration-1000 animate-pulse" style={{ width: `${getWidth(healthy)}%` }} />
                  <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${getWidth(orphans)}%` }} />
                  <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${getWidth(ghosts)}%` }} />
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Healthy */}
              <div className="p-4 rounded-2xl bg-green-50/40 border border-green-100/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-green-600">完美同步 (Healthy)</span>
                  <CheckCircle2 size={14} className="text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-700 leading-none">{auditResult?.healthyCount ?? 0}</div>
                <p className="text-[10px] text-green-600/70 font-medium">数据库与云端物理文件完全匹配</p>
              </div>

              {/* Orphans */}
              <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">孤儿文件 (Orphans)</span>
                  <CloudDownload size={14} className="text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-700 leading-none">{auditResult?.orphans?.count ?? 0}</div>
                <div className="space-y-1">
                   <p className="text-[10px] text-blue-600/70 font-medium truncate">R2 有文件但数据库丢失记录</p>
                   {(auditResult?.orphans?.count ?? 0) > 0 && (
                     <p className="text-[9px] text-blue-400 font-mono truncate">例: {auditResult?.orphans?.samples?.[0]?.key}</p>
                   )}
                </div>
              </div>

              {/* Ghosts */}
              <div className="p-4 rounded-2xl bg-red-50/40 border border-red-100/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600">幽灵记录 (Ghosts)</span>
                  <Trash2 size={14} className="text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-700 leading-none">{auditResult?.ghosts?.count ?? 0}</div>
                <div className="space-y-1">
                   <p className="text-[10px] text-red-600/70 font-medium truncate">数据库有记录但云端文件已丢失</p>
                   {(auditResult?.ghosts?.count ?? 0) > 0 && (
                     <p className="text-[9px] text-red-450 font-mono truncate">例: {auditResult?.ghosts?.samples?.[0]?.name}</p>
                   )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
            {isAuditing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-2">正在进行全量数据对账审计...</p>
              </>
            ) : (
              <>
                <PackageSearch className="w-6 h-6 text-slate-300 mb-2" />
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">暂无审计缓存，请点击上方按钮开始对账</p>
              </>
            )}
          </div>
        )}
      </div>

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
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {combinedIssues.map((issue) => (
            <motion.div
              layout
              key={issue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-brand-navy/5 rounded-2xl overflow-hidden shadow-sm hover:border-brand-navy/10 transition-colors"
            >
              <div className="p-4 flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${severityColors[issue.severity as keyof typeof severityColors]}`}>
                  {issue.severity === 'P0' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase border ${severityColors[issue.severity as keyof typeof severityColors]}`}>
                      {issue.severity}
                    </span>
                    <h3 className="text-sm font-bold text-brand-navy">{issue.title}</h3>
                  </div>
                  <p className="text-xs text-brand-navy/60 mb-3">{issue.description}</p>
                  
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100/60 mt-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 px-2.5 py-1 bg-slate-100/70 rounded-full shrink-0">
                       受影响: {issue.affectedCount} 项
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {ISSUE_ACTIONS[issue.id] ? (
                          <MaintenanceTool 
                            issueId={issue.id}
                            compact
                            onSuccess={() => {
                              refreshReport();
                              runAudit();
                            }}
                          />
                        ) : (
                          <button 
                            onClick={() => internalRunRepair(issue.id)}
                            disabled={isLoading}
                            className="text-[11px] font-black text-brand-gold px-4 py-1.5 bg-brand-gold/5 rounded-xl border border-brand-gold/10 hover:bg-brand-gold/10 transition-colors disabled:opacity-50 active:scale-95"
                          >
                            {issue.id.startsWith('perf_') ? '了解并忽略' : '立即自动修复'}
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {combinedIssues.length === 0 && !isLoading && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-3xl border border-dashed border-slate-200">
             <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
               <CheckCircle2 size={24} />
             </div>
             <div>
               <h3 className="text-base font-bold text-brand-navy">数据非常健康</h3>
               <p className="text-xs text-brand-navy/40">扫描完毕，未发现任何同步或完整性问题</p>
             </div>
          </div>
        )}
      </div>

      {/* 高级维护工具栏 */}
      <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 lg:p-8 space-y-8">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">系统维护指令中心 / SYSTEM MAINTENANCE CENTER</h3>
        
        {/* 第一组：必要定期检查 (Routine Checks) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-xs font-black text-slate-700">
            <CheckCircle2 size={14} className="text-emerald-500" />
            常规健康与数据同步 (Routine Sync & Health)
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MaintenanceTool 
              issueId="member_count_mismatch"
              title="校对合组成员数" 
              description="合组记录的成员数量与实际照片数量不符时执行此同步，修正计数显示不准的问题。"
              onSuccess={refreshReport}
            />
            <MaintenanceTool 
              issueId="orphan_files"
              title="找回云端孤儿照片" 
              description="扫描 R2 云端存储，如果在云端发现有照片但在数据库中丢失了记录，会尝试补全并恢复。"
              onSuccess={refreshReport}
            />
            <MaintenanceTool 
              issueId="empty_groups"
              title="清理空合组" 
              description="删除由于移除图片等原因不再包含任何照片的空组，保持数据整洁。"
              onSuccess={refreshReport}
            />
          </div>
        </div>

        {/* 高级与一次性操作，默认折叠 */}
        <div className="space-y-4 pt-4 border-t border-slate-200/60">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 w-full px-1 py-2 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
          >
            <ChevronDown size={14} className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
            高级清理与 AI 实验工具 (Advanced / Experimental)
          </button>
          
          <AnimatePresence>
            {showAdvanced && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-8 pt-2"
              >
                {/* 第二组：极端情况与系统深度清理 (Advanced Cleanup) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1 text-xs font-bold text-slate-700">
                    <ShieldAlert size={14} className="text-amber-500" />
                    极端恢复与废弃清理
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <MaintenanceTool 
                      issueId="ghost_records"
                      title="清理幽灵数据记录" 
                      description="【危险操作】兜底清理数据库中完全损坏（无头无哈希无URL）的无效记录。通常为一次性操作。"
                      danger
                      onSuccess={refreshReport}
                    />
                  </div>
                </div>

                {/* 第三组：AI 大规模重构与未来演进 (AI Orchestration) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1 text-xs font-bold text-slate-700">
                    <Zap size={14} className="text-purple-500" />
                    AGNES AI 批处理 (按需执行)
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <MaintenanceTool 
                      issueId="agnes_retranslate"
                      title="Agnes 全量语种校对" 
                      description="利用 AI 引擎对存量照片进行底层语种机翻校对。批量调用消耗大，非必要不执行。"
                      onSuccess={refreshReport}
                    />
                    <MaintenanceTool 
                      issueId="agnes_redimension"
                      title="Agnes 深度尺寸重提" 
                      description="利用 AI 模型更正旧数据库中的遗漏尺寸属性。仅在引入新解析策略时一次性执行。"
                      onSuccess={refreshReport}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
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

function TasksContent() {
  const { tasks = [], isLoading, refetch } = useGlobalTasks();
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  
  const stats = {
    total: safeTasks.length,
    active: safeTasks.filter(t => t.status === 'processing').length,
    completed: safeTasks.filter(t => t.status === 'completed').length,
    failed: safeTasks.filter(t => t.status === 'failed').length,
  };

  return (
    <div className="space-y-8">
      {/* 概览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '全部记录', value: stats.total, icon: History, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: '进行中', value: stats.active, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: '已完成', value: stats.completed, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: '失败/异常', value: stats.failed, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`p-5 rounded-[24px] ${stat.bg} border border-white shadow-sm space-y-1`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
              <stat.icon size={14} className={stat.color} />
            </div>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm overflow-hidden min-h-[400px]">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <h3 className="text-sm font-black text-brand-navy uppercase tracking-tight flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" />
              后台任务队列
            </h3>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 px-3 rounded-full text-[10px] font-black uppercase tracking-widest">
              <RefreshCw size={12} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          <div className="space-y-4">
            {safeTasks.length === 0 ? (
              <EmptyState 
                title="暂无执行记录" 
                icon={<PackageSearchIcon size={48} className="opacity-20" />}
              />
            ) : (
              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {safeTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: UnifiedTask }) {
  const isMaintenance = task.source === 'maintenance';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-white hover:shadow-md transition-all duration-300"
    >
      <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-sm relative">
        {task.status === 'processing' ? (
          <div className="relative">
             <RefreshCw size={20} className="text-blue-500 animate-spin" />
             <div className="absolute inset-0 bg-blue-500/10 blur-xl animate-pulse" />
          </div>
        ) : task.status === 'completed' ? (
          <CheckCircle2 size={24} className="text-green-500" />
        ) : (
          <AlertTriangle size={24} className="text-red-500" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0 border-none ${
            isMaintenance ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
          }`}>
            {isMaintenance ? '系统维护' : '会话任务'}
          </Badge>
          <span className="text-sm font-black text-brand-navy truncate uppercase tracking-tight">
            {task.title}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatters.time(task.createdAt)}
          </span>
          {task.total && (
             <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">
               进度: {task.processed}/{task.total}
             </span>
          )}
        </div>

        {task.message && (
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">
            {task.message}
          </p>
        )}
      </div>

      <div className="md:w-48 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-bold text-slate-400">PROGRESS</span>
          <span className="text-[10px] font-black text-slate-600 tabular-nums">{Math.round(task.progress)}%</span>
        </div>
        <Progress value={task.progress} className="h-1.5" />
      </div>
    </motion.div>
  );
}
