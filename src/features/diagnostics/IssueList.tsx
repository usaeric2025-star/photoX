import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { MaintenanceTool } from './MaintenanceTool';
import { ISSUE_ACTIONS } from '@/features/diagnostics/issueActions';

const severityColors = {
  P0: 'bg-red-50 text-red-600 border-red-100',
  P1: 'bg-orange-50 text-orange-600 border-orange-100',
  P2: 'bg-blue-50 text-blue-600 border-blue-100'
};

import { DiagnosticIssue } from '@/types/diagnostics';

interface IssueListProps {
  issues: DiagnosticIssue[];
  isPending: boolean;
  onRepair: (id: string) => void;
  onSuccess: () => void;
}

export function IssueList({ issues, isPending, onRepair, onSuccess }: IssueListProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="bg-white border border-brand-navy/5 rounded-2xl overflow-hidden shadow-sm hover:border-brand-navy/10 transition-colors animate-fade-in"
          >
            <div className="p-4 flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${severityColors[issue.severity as keyof typeof severityColors]}`}>
                {issue.severity === 'P0' ? <Icon name="shield-alert" size={20} /> : <Icon name="alert-triangle" size={20} />}
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
                          onSuccess={onSuccess}
                        />
                      ) : (
                        <button 
                          onClick={() => onRepair(issue.id)}
                          disabled={isPending}
                          className="text-[11px] font-black text-brand-gold px-4 py-1.5 bg-brand-gold/5 rounded-xl border border-brand-gold/10 hover:bg-brand-gold/10 transition-colors disabled:opacity-50 active:scale-95"
                        >
                          {issue.id.startsWith('perf_') ? '了解并忽略' : '立即自动修复'}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {issues.length === 0 && !isPending && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-3xl border border-dashed border-slate-200">
           <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
             <Icon name="check-circle-2" size={24} />
           </div>
           <div>
             <h3 className="text-base font-bold text-brand-navy">数据非常健康</h3>
             <p className="text-xs text-brand-navy/40">扫描完毕，未发现任何同步或完整性问题</p>
           </div>
        </div>
      )}
    </div>
  );
}
