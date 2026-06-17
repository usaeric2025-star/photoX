import React from 'react';
import { RefreshCw } from 'lucide-react';
import { formatters } from '@/utils/formatters';

import { DiagnosticsReport } from '@/types/diagnostics';

interface DiagnosticStatsProps {
  report: DiagnosticsReport | null;
  isPending: boolean;
  onRefresh: () => void;
}

export function DiagnosticStats({ report, isPending, onRefresh }: DiagnosticStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: '异常记录 (P0)', value: report?.totalIssues || 0, color: 'text-red-600' },
        { label: '重要发现 (P1/P2)', value: (report?.issuesBySeverity?.P1 || 0) + (report?.issuesBySeverity?.P2 || 0), color: 'text-slate-900' },
        { label: '最后扫描', value: report?.timestamp ? formatters.dateTime(report.timestamp) : '-', color: 'text-slate-500 font-mono' },
      ].map((stat, i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between h-24">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
          <p className={`text-2xl font-semibold mt-1 tracking-tight ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
      <button 
        onClick={onRefresh}
        disabled={isPending}
        className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center gap-1 group active:scale-95 transition-all disabled:opacity-50 h-24"
      >
        <RefreshCw className={`w-4 h-4 text-white ${isPending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
        <span className="text-xs font-semibold mt-1">全域扫描</span>
      </button>
    </div>
  );
}
