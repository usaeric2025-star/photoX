import React from 'react';
import { 
  RefreshCw, CheckCircle2, ShieldAlert, AlertTriangle, 
  Trash2, PackageSearch, CloudDownload, Zap, Fingerprint, History, ShieldCheck,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDiagnostics } from '@/hooks/admin/useDiagnostics';
import { DiagnosticCard } from './Diagnostics/DiagnosticCard';
import { MaintenanceTool } from './Diagnostics/MaintenanceTool';
import { ISSUE_ACTIONS } from '@/features/maintenance/issueActions';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';

const severityColors = {
  P0: 'bg-red-50 text-red-600 border-red-100',
  P1: 'bg-orange-50 text-orange-600 border-orange-100',
  P2: 'bg-blue-50 text-blue-600 border-blue-100'
};

/**
 * [REFACTORED] DiagnosticsDashboard
 * Refactored using Atomic Design.
 * Logic extracted to useDiagnostics and useMaintenanceActions hooks.
 * UI components extracted to DiagnosticCard and MaintenanceToolButton.
 */
export function DiagnosticsDashboard() {
  const navigate = useNavigate();
  const { 
    report, isLoading, refreshReport, runRepair,
    runR2Diagnostics, isDiagnosingR2, r2Result,
    handleTestWorker, isTestingWorker, workerResult,
    runAudit, isAuditing, auditResult
  } = useDiagnostics();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-brand-navy" />
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-brand-navy tracking-tight uppercase">系统诊断中心</h1>
            <p className="text-xs text-slate-500 font-medium">REAL-TIME SYSTEM DIAGNOSIS & RECOVERY ENGINE</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate({ to: '/admin/tasks' })}
            className="rounded-full bg-slate-900 text-white hover:bg-slate-800 border-none transition-all h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg"
          >
            <Zap size={14} className="text-yellow-400 fill-yellow-400" />
            任务指挥部
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate({ to: '/admin/history/maintenance' })}
            className="rounded-full bg-white border-slate-200 text-slate-600 hover:text-brand-navy hover:border-brand-navy transition-all h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2"
          >
            <History size={14} />
            维护序列历史
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              refreshReport();
              runAudit();
            }}
            disabled={isLoading}
            className="rounded-full hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* 核心指标统计 */}
      {/* ... previous content ... */}

      {/* R2 对账可视化 (P0) */}
      <div className="bg-white border border-brand-navy/5 rounded-[32px] p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <PackageSearch size={120} />
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-brand-navy uppercase tracking-tight flex items-center gap-2">
              <PackageSearch size={18} className="text-blue-500" />
              R2 云端对账审计报告
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consistency Audit between R2 Storage and Database</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={runAudit} 
            disabled={isAuditing}
            className="text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-full"
          >
            {isAuditing ? <RefreshCw size={12} className="animate-spin mr-2" /> : <RefreshCw size={12} className="mr-2" />}
            重新审计
          </Button>
        </div>

        {auditResult ? (
          <div className="space-y-6">
            {/* 可视化条形图 */}
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-500 transition-all duration-1000" 
                style={{ width: `${(auditResult.healthyCount / (auditResult.healthyCount + auditResult.orphans.count + auditResult.ghosts.count)) * 100}%` }}
              />
              <div 
                className="h-full bg-blue-500 transition-all duration-1000" 
                style={{ width: `${(auditResult.orphans.count / (auditResult.healthyCount + auditResult.orphans.count + auditResult.ghosts.count)) * 100}%` }}
              />
              <div 
                className="h-full bg-red-500 transition-all duration-1000" 
                style={{ width: `${(auditResult.ghosts.count / (auditResult.healthyCount + auditResult.orphans.count + auditResult.ghosts.count)) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Healthy */}
              <div className="p-4 rounded-2xl bg-green-50/50 border border-green-100/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-600">完美同步 (Healthy)</span>
                  <CheckCircle2 size={14} className="text-green-500" />
                </div>
                <div className="text-2xl font-black text-green-700">{auditResult.healthyCount}</div>
                <p className="text-[10px] text-green-600/70 font-bold uppercase">数据库与云端物理文件完全匹配</p>
              </div>

              {/* Orphans */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">孤儿文件 (Orphans)</span>
                  <CloudDownload size={14} className="text-blue-500" />
                </div>
                <div className="text-2xl font-black text-blue-700">{auditResult.orphans.count}</div>
                <div className="space-y-1">
                   <p className="text-[10px] text-blue-600/70 font-bold uppercase truncate">R2 有文件但数据库丢失记录</p>
                   {auditResult.orphans.count > 0 && (
                     <p className="text-[9px] text-blue-400 truncate">例: {auditResult.orphans.samples[0]?.key}</p>
                   )}
                </div>
              </div>

              {/* Ghosts */}
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-600">幽灵记录 (Ghosts)</span>
                  <Trash2 size={14} className="text-red-500" />
                </div>
                <div className="text-2xl font-black text-red-700">{auditResult.ghosts.count}</div>
                <div className="space-y-1">
                   <p className="text-[10px] text-red-600/70 font-bold uppercase truncate">数据库有记录但云端文件已丢失</p>
                   {auditResult.ghosts.count > 0 && (
                     <p className="text-[9px] text-red-400 truncate">例: {auditResult.ghosts.samples[0]?.name}</p>
                   )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{isAuditing ? '正在全量对账...' : '等待审计...'}</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '异常记录 (P0)', value: report?.totalIssues || 0, color: 'text-red-500' },
          { label: '重要发现 (P1/P2)', value: (report?.issuesBySeverity.P1 || 0) + (report?.issuesBySeverity.P2 || 0), color: 'text-brand-navy' },
          { label: '最后扫描', value: report?.timestamp ? new Date(report.timestamp).toLocaleTimeString() : '-', color: 'text-slate-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-brand-navy/5 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
        <button 
          onClick={refreshReport}
          disabled={isLoading}
          className="bg-brand-navy text-white rounded-2xl p-4 shadow-lg shadow-brand-navy/20 flex flex-col items-center justify-center gap-1 group active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          <span className="text-xs font-bold">全域扫描</span>
        </button>
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
          onTest={handleTestWorker}
          isLoading={isTestingWorker}
          result={workerResult}
          successColor="text-brand-gold"
        />
      </div>

      {/* 智能故障修复列表 */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {report?.issues.map((issue) => (
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
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-brand-navy/40 px-2 py-1 bg-brand-navy/5 rounded-lg">
                       受影响: {issue.affectedCount}
                    </div>
                    
                    <div className="flex gap-2">
                       {ISSUE_ACTIONS[issue.id] ? (
                         <MaintenanceTool 
                           issueId={issue.id}
                           compact
                           onSuccess={refreshReport}
                         />
                       ) : (
                         <button 
                           onClick={() => runRepair(issue.id)}
                           disabled={isLoading}
                           className="text-[11px] font-black text-brand-gold px-4 py-1.5 bg-brand-gold/5 rounded-xl border border-brand-gold/10 hover:bg-brand-gold/10 transition-colors disabled:opacity-50 active:scale-95"
                         >
                           立即自动修复
                         </button>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {report?.totalIssues === 0 && !isLoading && (
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
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">高级维护工具箱 / ADVANCED TOOLKIT</h3>
        
        {/* 第一组：数据资产同步 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-xs font-black text-slate-700">
            <CloudDownload size={14} className="text-blue-500" />
            云端存储与同步
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MaintenanceTool 
              issueId="orphan_files"
              title="找回孤儿照片" 
              description="扫描 R2 云端并恢复那些在数据库中丢失记录的照片"
              onSuccess={refreshReport}
            />
            <MaintenanceTool 
              issueId="member_count_mismatch"
              title="修复成员数" 
              description="合组记录的成员数量与实际照片数量不符时执行同步"
              onSuccess={refreshReport}
            />
          </div>
        </div>

        {/* 第三组：系统架构演进 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-xs font-black text-slate-700">
            <ShieldAlert size={14} className="text-amber-500" />
            系统安全性与清理
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MaintenanceTool 
              issueId="ghost_records"
              title="清理幽灵记录" 
              description="移除数据库中完全损坏（无图无哈希）的废弃数据"
              danger
              onSuccess={refreshReport}
            />
            <MaintenanceTool 
              issueId="cleanup_temp_urls"
              title="物理路径 UUID 化" 
              description="将存量的临时 temp- 路径转换为规范的 UUID 存储结构"
              onSuccess={refreshReport}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
