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
import { client, api } from '@/lib/api';
import { DiagnosticsReport, DiagnosticIssue } from '@/types/diagnostics';
import { motion, AnimatePresence } from 'motion/react';
import { fromThrowableAsync } from '@/lib/errorFactory';
import { toast } from 'sonner';

export function DiagnosticsDashboard() {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [r2Result, setR2Result] = useState<any | null>(null);
  const [isDiagnosingR2, setIsDiagnosingR2] = useState(false);
  const [r2Error, setR2Error] = useState<string | null>(null);

  const runR2Diagnostics = async () => {
    setIsDiagnosingR2(true);
    setR2Error(null);
    const result = await fromThrowableAsync(
        () => api.admin['diagnose-r2'].$get(),
        'diagnoseR2'
    );

    if (!result.ok) {
        setR2Error(`诊断请求失败: ${result.message}`);
        toast.error('R2 诊断接口异常');
        setIsDiagnosingR2(false);
        return;
    }

    const res = result.data as Response;
    if (!res.ok) {
        setR2Error(`HTTP 异常 ${res.status}`);
        toast.error('R2 诊断请求失败');
        setIsDiagnosingR2(false);
        return;
    }

    try {
        const data = await res.json();
        setR2Result(data);
        if (data.success) {
            toast.success('R2 存储连接测试成功');
        } else {
            toast.error('R2 存储测试未通过，请检查下方报告');
        }
    } catch (e: any) {
        setR2Error(`解析 JSON 失败: ${e.message}`);
    }
    setIsDiagnosingR2(false);
  };

  const runDiagnostics = async () => {
    setIsLoading(true);
    setError(null);
    const result = await fromThrowableAsync(
        () => api.admin.diagnose.$get(),
        'runDiagnostics'
    );
    
    if (!result.ok) {
        setError(result.message);
        toast.error('诊断运行失败');
        setIsLoading(false);
        return;
    }

    const res = result.data as Response;
    if (!res.ok) {
        setError('Failed to run diagnostics');
        toast.error('诊断运行失败');
        setIsLoading(false);
        return;
    }
    const data = await res.json() as any;
    setReport(data);
    setIsLoading(false);
  };

  const runRepair = async (issueId: string) => {
    setIsLoading(true);
    const result = await fromThrowableAsync(
        () => api.admin.repair[':issueId'].$post({
            param: { issueId }
        }),
        'runRepair'
    );

    if (!result.ok) {
        setError(`修复失败: ${result.message}`);
        toast.error('修复请求失败');
        setIsLoading(false);
        return;
    }
    
    const res = result.data as Response;
    if (!res.ok) {
        setError('Repair failed');
        toast.error('修复失败');
        setIsLoading(false);
        return;
    }
    await runDiagnostics(); // Refresh
    setIsLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
    runR2Diagnostics();
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

      {/* R2 存储连通性诊断 */}
      <div className="bg-white border border-brand-navy/5 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-brand-navy tracking-tight">R2 存储连通性诊断</h3>
            <p className="text-xs text-brand-navy/60">实时验证 Cloudflare R2 云端存储的端点、凭证和读写权限</p>
          </div>
          <button
            onClick={runR2Diagnostics}
            disabled={isDiagnosingR2}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-navy text-white rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-brand-navy/90 transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosingR2 ? 'animate-spin' : ''}`} />
            {isDiagnosingR2 ? '测试中...' : '测试 R2 连接'}
          </button>
        </div>

        {r2Error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p>{r2Error}</p>
          </div>
        )}

        {r2Result && (
          <div className="space-y-4">
            {/* Status indicator */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              r2Result.success 
                ? 'bg-green-500/5 border-green-500/10 text-green-700' 
                : 'bg-red-500/5 border-red-500/10 text-red-700'
            }`}>
              <div className="mt-0.5">
                {r2Result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900">
                  {r2Result.success ? 'R2 连通性测试通过' : 'R2 连通性测试未通过'}
                </h4>
                <div className="text-xs mt-1 text-gray-500 font-medium leading-relaxed">
                  {r2Result.success 
                    ? r2Result.message 
                    : `在 [${r2Result.stage}] 阶段异常: ${r2Result.error}`
                  }
                </div>
              </div>
            </div>

            {/* Environmental & Key list */}
            {r2Result.details?.configState && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-sans">
                {Object.entries(r2Result.details.configState).map(([key, state]: [string, any]) => (
                  <div key={key} className="p-3 bg-brand-navy/5 border border-brand-navy/5 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-brand-navy/40 truncate">{key}</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-bold font-mono truncate text-brand-navy/80">
                        {state.exists ? (state.preview || '已配置') : '未配置'}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                        state.exists 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {state.exists ? 'OK' : 'MISSING'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
