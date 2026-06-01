import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  ExternalLink,
  Table,
  FileWarning,
  Bug
} from 'lucide-react';
import { client } from '@/lib/api';
import { DiagnosticsReport, DiagnosticIssue } from '@/types/diagnostics';
import { motion, AnimatePresence } from 'motion/react';

export function DiagnosticsDashboard() {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await (client as any).admin.diagnose.$get();
      if (!res.ok) throw new Error('Failed to run diagnostics');
      const data = await res.json() as any;
      setReport(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const runRepair = async (issueId: string) => {
    setIsLoading(true);
    try {
      const res = await (client as any).admin.repair[':issueId'].$post({
        param: { issueId }
      });
      if (!res.ok) throw new Error('Repair failed');
      await runDiagnostics(); // Refresh
    } catch (e: any) {
      setError(`修复失败: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const severityColors = {
    P0: 'text-red-500 bg-red-500/10 border-red-500/20',
    P1: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    P2: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    P3: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  };

  const categoryIcons = {
    integrity: <Table className="w-4 h-4" />,
    consistency: <RefreshCw className="w-4 h-4" />,
    file: <FileWarning className="w-4 h-4" />,
    logic: <Bug className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-brand-navy tracking-tight">系统健康诊断</h2>
          <p className="text-sm text-brand-navy/60">深度扫描数据库中的合规性、完整性与逻辑错误</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-gold/20 disabled:opacity-50 transition-all active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? '扫描中...' : '重新扫描'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="总问题数" value={report.totalIssues} sub={report.totalIssues === 0 ? '全绿健康' : '待处理'} color="navy" />
          <StatCard label="P0 致命" value={report.issuesBySeverity.P0} sub="立即修复" color={report.issuesBySeverity.P0 > 0 ? 'red' : 'green'} />
          <StatCard label="P1 重要" value={report.issuesBySeverity.P1} sub="建议查看" color={report.issuesBySeverity.P1 > 0 ? 'orange' : 'green'} />
          <StatCard label="上次扫描" value="刚刚" sub={new Date(report.timestamp).toLocaleTimeString()} color="navy" />
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {report?.issues.map((issue) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-brand-navy/5 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="p-4 flex items-start gap-4">
                <div className={`p-3 rounded-xl ${severityColors[issue.severity]}`}>
                  {issue.severity === 'P0' ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase border ${severityColors[issue.severity]}`}>
                      {issue.severity}
                    </span>
                    <span className="text-[10px] font-black text-brand-navy/30 uppercase flex items-center gap-1">
                      {categoryIcons[issue.category]}
                      {issue.category}
                    </span>
                    <h3 className="text-base font-bold text-brand-navy">{issue.title}</h3>
                  </div>
                  <p className="text-sm text-brand-navy/60 mb-3">{issue.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-brand-navy px-2 py-1 bg-brand-navy/5 rounded-lg">
                         受影响: {issue.affectedCount}
                       </span>
                       <div className="flex -space-x-1">
                         {issue.sampleIds.slice(0, 3).map(sid => (
                           <div key={sid} className="w-6 h-6 rounded-full bg-brand-navy/10 border-2 border-white flex items-center justify-center text-[8px] font-bold text-brand-navy/40">
                             {sid.slice(-2)}
                           </div>
                         ))}
                       </div>
                    </div>
                    
                    {issue.autoFixable && (
                      <button 
                        onClick={() => runRepair(issue.id)}
                        disabled={isLoading}
                        className="text-xs font-bold text-brand-gold px-3 py-1.5 bg-brand-gold/5 rounded-xl border border-brand-gold/10 hover:bg-brand-gold/10 transition-colors disabled:opacity-50"
                      >
                        立即自动修复
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {report?.totalIssues === 0 && !isLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
               <CheckCircle2 className="w-8 h-8" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-brand-navy">数据非常健康</h3>
               <p className="text-sm text-brand-navy/40">扫描完毕，未发现任何 P0 或 P1 级别的异常记录</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string, value: any, sub: string, color: string }) {
  const colors = {
    navy: 'text-brand-navy bg-brand-navy/5',
    red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50',
    green: 'text-green-600 bg-green-50',
  };
  
  return (
    <div className={`p-4 rounded-2xl border border-brand-navy/5 ${colors[color as keyof typeof colors]}`}>
      <div className="text-[10px] font-black uppercase opacity-40 mb-1">{label}</div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-[10px] font-bold opacity-60 uppercase">{sub}</div>
    </div>
  );
}
