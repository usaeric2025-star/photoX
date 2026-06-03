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
  Bug,
  Trash2,
  PackageSearch,
  CloudDownload,
  Fingerprint
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fromThrowableAsync } from '@/lib/errorFactory';
import { toast } from 'sonner';
import { DiagnosticsReport } from '@/types/diagnostics';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/hooks';
import { deduplicatePhotos } from "@/services/photo/photoMaintenanceService";
import { useUIStore } from '@/store/useUIStore';



export function DiagnosticsDashboard() {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [r2Result, setR2Result] = useState<any | null>(null);
  const [isDiagnosingR2, setIsDiagnosingR2] = useState(false);
  const [r2Error, setR2Error] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { isPending: isRepairing, mutate: repair } = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await api.admin.repair[':issueId'].$post({
        param: { issueId }
      });
      if (!res.ok) {
        const errorData = await res.json() as any;
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }
      return res.json() as any;
    },
    onSuccess: (data) => {
        toast.success(data.message || "修复成功");
        scan(); // Refresh after repair
    },
    onError: (err: any) => {
        toast.error(`修复尝试失败: ${err.message}`);
    }
  });

  const { isPending: isScanning, mutate: scan } = useMutation({
    mutationFn: () => api.admin.diagnose.$get(),
    onSuccess: async (res) => {
        const data = await (res as unknown as Response).json();
        setReport(data);
    },
    onError: (err: any) => {
        setError(`扫描失败: ${err.message}`);
        toast.error('诊断运行失败');
    }
  });

  const runDiagnostics = () => scan();
  const runRepair = (issueId: string) => repair(issueId);

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

  const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);
  const [isDeepCleaningStorage, setIsDeepCleaningStorage] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [isCleaningRedundant, setIsCleaningRedundant] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);

  const { user } = useAuth();
  const update = useUIStore(s => s.update);

  const handleDeduplicate = async () => {
    if (!user) return toast.error("请先登录");
    if (!confirm('确定要执行排重清理吗？系统将合并完全一致的照片记录。')) return;
    
    setIsDeduplicating(true);
    try {
      const result = await deduplicatePhotos(user.id);
      if (result.ok) {
        toast.success(`排重完成！共清理了 ${result.data.removed} 张重复记录。`);
        scan();
      } else {
        toast.error(`排重失败: ${result.message}`);
      }
    } catch (e: any) {
      toast.error(`请求失败: ${e.message}`);
    } finally {
      setIsDeduplicating(false);
    }
  };

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await api.storage.audit.$get();
      if (!res.ok) throw new Error("对账请求失败");
      const data = await res.json() as any;
      if (data.success) {
        setAuditResult(data.data);
        toast.success("存储对账完成");
      } else {
        toast.error("对账失败");
      }
    } catch (e: any) {
      toast.error(`对账失败: ${e.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCleanOrphans = async () => {
    if (!confirm('确定要清理幽灵记录吗？此操作不可逆。')) return;
    setIsCleaningOrphans(true);
    try {
      const res = await api.storage['clean-orphans'].$post();
      const data = await res.json() as any;
      if (data.success) {
        toast.success(`清理完成，共移除 ${data.count} 条无效记录`);
        scan();
      } else {
        toast.error(`清理失败: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`请求失败: ${e.message}`);
    } finally {
      setIsCleaningOrphans(false);
    }
  };

  const handleCleanupRedundant = async () => {
    if (!confirm('确定要合并并清理冗余记录吗？相同 URL 的照片将只保留最早的一条。这会修复因恢复脚本缺陷导致的重复数据。')) return;
    setIsCleaningRedundant(true);
    try {
      const res = await api.admin.repair[':issueId'].$post({
        param: { issueId: 'cleanup_redundant' }
      });
      const data = await res.json() as any;
      if (data.success) {
        toast.success(data.message);
        scan();
      } else {
        toast.error(`处理失败: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`请求失败: ${e.message}`);
    } finally {
      setIsCleaningRedundant(false);
    }
  };

  const handleDeepCleanStorage = async () => {
    if (!confirm('确定要执行存储深度清理吗？这会删除 R2 中未在数据库中记录的文件。')) return;
    setIsDeepCleaningStorage(true);
    try {
      const res = await api.storage.clean.$post();
      const data = await res.json() as any;
      if (data.success) {
        toast.success(`清理完成，共移除 ${data.count} 个无主文件`);
      } else {
        toast.error(`清理失败: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`请求失败: ${e.message}`);
    } finally {
      setIsDeepCleaningStorage(false);
    }
  };

  const handleImportOrphans = async () => {
    setIsAuditing(true);
    try {
      const res = await api.storage['import-orphans'].$post();
      const data = await res.json() as any;
      if (data.success) {
        toast.success(data.message || `成功恢复 ${data.count} 张照片`);
        if (data.remaining > 0) {
          toast.info(`还有约 ${data.remaining} 张照片待恢复，可再次点击`, { duration: 5000 });
        }
        scan();
      } else {
        toast.error(`恢复失败: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`请求失败: ${e.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRepairHashes = async () => {
    setIsAuditing(true);
    try {
      const res = await api.storage['repair-hashes'].$post();
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as any;
      if (data.success) {
        if (data.count > 0) {
          toast.success(data.message);
          scan();
        } else {
          toast.info("没有发现需要修复的哈希值");
        }
      } else {
        toast.error(`修复失败: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`请求失败: ${e.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleForceDeleteHashes = async () => {
    if (!confirm('确定要强制删除所有缺失哈希的记录吗？这些照片可能已经损坏或无法关联 R2 文件。此操作不可撤销。')) return;
    setIsAuditing(true);
    try {
      const res = await api.admin.repair[':issueId'].$post({
        param: { issueId: 'force_delete_missing_hashes' }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as any;
      if (data.success) {
        toast.success(data.message);
        scan();
      } else {
        toast.error(`强制删除失败: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`请求失败: ${e.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    scan();
    runR2Diagnostics();
  }, []);

  const isLoading = isScanning || isRepairing;


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

      {/* 高级维护工具 */}
      <div className="bg-white border border-brand-navy/5 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-black text-brand-navy tracking-tight uppercase tracking-widest text-[11px] mb-4">高级维护工具</h3>
        </div>
        
        {/* 数据清理 */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest px-1">数据清理</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleCleanupRedundant}
              disabled={isCleaningRedundant}
              className="flex flex-col items-start gap-2 p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all border border-amber-200 group group-active:scale-95 text-left"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-800">清理冗余 URL 记录</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">合并具有完全相同 URL 的多余记录（修复恢复脚本遗留问题）</p>
              {isCleaningRedundant && <span className="text-[10px] font-bold text-amber-600 animate-pulse">正在清理中...</span>}
            </button>

            <button
              onClick={handleCleanOrphans}
              disabled={isCleaningOrphans}
              className="flex flex-col items-start gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 group group-active:scale-95 text-left"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-600">
                  <FileWarning className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-800">清理数据库孤本</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">删除数据库中无 URL / 无 Hash 的无效记录</p>
              {isCleaningOrphans && <span className="text-[10px] font-bold text-orange-600 animate-pulse">正在清理中...</span>}
            </button>

            <button
              onClick={handleDeepCleanStorage}
              disabled={isDeepCleaningStorage}
              className="flex flex-col items-start gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 group group-active:scale-95 text-left"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-800">清理存储无主文件</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">扫描 R2 存储，删除未在数据库引用的孤立文件</p>
              {isDeepCleaningStorage && <span className="text-[10px] font-bold text-blue-600 animate-pulse">正在扫描中...</span>}
            </button>
          </div>
        </div>

        {/* 数据恢复 */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest px-1">数据恢复</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleImportOrphans}
              disabled={isAuditing}
              className="flex flex-col items-start gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-all border border-green-200 group group-active:scale-95 text-left"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                  <CloudDownload className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-800">恢复孤儿照片</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">从云端找回丢失记录并自动补全哈希 (去重保护)</p>
              {isAuditing && <span className="text-[10px] font-bold text-green-600 animate-pulse">正在处理中...</span>}
            </button>
          </div>
        </div>

        {/* 数据去重 */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest px-1">数据去重</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDeduplicate}
              disabled={isDeduplicating}
              className="flex flex-col items-start gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 group group-active:scale-95 text-left"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-800">重复资产清理</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">寻找并合并数据库中哈希值一致的重复记录</p>
              {isDeduplicating && <span className="text-[10px] font-bold text-purple-600 animate-pulse">正在排重中...</span>}
            </button>
          </div>
        </div>

        {/* 审计 */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest px-1">审计</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleAudit}
              disabled={isAuditing}
              className="flex flex-col items-start gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 group group-active:scale-95 text-left"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-500/10 rounded-lg text-teal-600">
                  <PackageSearch className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-800">存储资产对账</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">深度审计 R2 文件与数据库的一致性，生成对账报告</p>
              {isAuditing && <span className="text-[10px] font-bold text-teal-600 animate-pulse">正在对账中...</span>}
              {auditResult && (
                <div className="mt-2 text-[8px] font-bold text-slate-400 bg-white/50 p-1.5 rounded-lg w-full">
                  正常: {auditResult.healthy} | 缺失: {auditResult.missing} | 孤儿: {auditResult.orphans}
                </div>
              )}
            </button>
          </div>
        </div>
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
                    
                    <div className="flex items-center gap-2">
                      {issue.autoFixable && (
                        <button 
                          onClick={() => runRepair(issue.id)}
                          disabled={isLoading}
                          className="text-xs font-bold text-brand-gold px-3 py-1.5 bg-brand-gold/5 rounded-xl border border-brand-gold/10 hover:bg-brand-gold/10 transition-colors disabled:opacity-50"
                        >
                          立即自动修复
                        </button>
                      )}
                      {issue.id === 'missing_hashes' && (
                        <button 
                          onClick={handleForceDeleteHashes}
                          disabled={isLoading}
                          className="text-xs font-bold text-red-500 px-3 py-1.5 bg-red-500/5 rounded-xl border border-red-500/10 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          强制删除无效记录
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
