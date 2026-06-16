import React from 'react';
import { PackageSearch, CheckCircle2, CloudDownload, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { PreviewResult } from '@/services/maintenance/issueActions';

interface AuditVisualizerProps {
  auditResult: PreviewResult | null;
  isAuditing: boolean;
  onAudit: () => void;
}

export function AuditVisualizer({ auditResult, isAuditing, onAudit }: AuditVisualizerProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
        <PackageSearch size={120} />
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <PackageSearch size={18} className="text-blue-500" />
            R2 云端对账审计报告
            {auditResult?.truncated && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full animate-pulse">
                扫描已截断 / TRUNCATED
              </span>
            )}
          </h3>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {auditResult?.truncated 
              ? "Performance Mode: Only checking first 50,000 objects to prevent timeout"
              : "Consistency Audit between R2 Storage and Database"}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAudit} 
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
  );
}
