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
  Fingerprint,
  Zap
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fromThrowableAsync } from '@/lib/errorFactory';
import { toast } from 'sonner';
import { DiagnosticsReport } from '@/types/diagnostics';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/hooks';
import { deduplicatePhotos, bulkFixPhotoUrls } from "@/services/photo/photoMaintenanceService";
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
      const res = await api.admin.repair.$post({
        json: { issueId }
      });
      if (!res.ok) {
        const errorData = await res.json() as any;
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }
      return res.json() as any;
    },
    onSuccess: (data) => {
        toast.success(data.message || "修复成功");
        queryClient.invalidateQueries({ queryKey: ['photos'] });
        queryClient.invalidateQueries({ queryKey: ['groups'] });
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
  const [isCleaningTemp, setIsCleaningTemp] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{ processed: number; totalRemaining: number; results: any[] } | null>(null);

  const [isNormalizingCodes, setIsNormalizingCodes] = useState(false);
  const [isTestingWorker, setIsTestingWorker] = useState(false);
  const [workerResult, setWorkerResult] = useState<{ 
    success: boolean; 
    message: string; 
    latency?: number;
    status?: number;
    statusText?: string;
    url?: string;
    contentType?: string | null;
    isRealImage?: boolean;
  } | null>(null);

  const { user } = useAuth();
  const update = useUIStore(s => s.update);

  const handleCleanupTempUrls = async () => {
    if (!confirm('确定要将这些临时路径 (temp-) 复制重命名并转换为标准 UUID 文件名吗？这将对 R2 存储空间完成原地升级，保证数据 100% 格式美化与安全对齐。')) return;
    setIsCleaningTemp(true);
    try {
      const res = await api.admin.repair.$post({
        json: { issueId: 'cleanup_temp_urls' }
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
      setIsCleaningTemp(false);
    }
  };

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
      const res = await api.admin.repair.$post({
        json: { issueId: 'cleanup_redundant' }
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

  const handleBulkFixUrls = async () => {
    if (!confirm('确定要将所有图片 URL 标准化吗？这将修复损坏的图像链接并移除缩略图前缀。')) return;
    setIsAuditing(true);
    try {
      const result = await bulkFixPhotoUrls();
      toast.success(`修复完成：${result.updated} 条URL更新，${result.errors} 条失败。`);
      scan();
    } catch (e: any) {
      toast.error(`修复失败: ${e.message}`);
    } finally {
      setIsAuditing(false);
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
      const res = await api.admin.repair.$post({
        json: { issueId: 'force_delete_missing_hashes' }
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

  const handleNormalizeItemCodes = async () => {
    if (!confirm('确定要规范所有系统编号吗？这将把旧格式（如 FUR-xxx）转换为新格式（X-XXXXXXXX）。此操作不可逆，将影响搜索和 AI 对话。')) return;
    setIsNormalizingCodes(true);
    try {
      const res = await api.maintenance['normalize-item-codes'].$post();
      const data = await res.json() as any;
      if (data.success) {
        toast.success(data.message || `成功规范 ${data.count} 条编号`);
        if (data.remaining > 0) {
          toast.info(`还有约 ${data.remaining} 条记录待规范，可再次点击`, { duration: 5000 });
        }
        scan();
      } else {
        toast.error(`规范失败: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`请求失败: ${e.message}`);
    } finally {
      setIsNormalizingCodes(false);
    }
  };

  const handleTestWorker = async () => {
    setIsTestingWorker(true);
    try {
      const res = await api.admin.repair.$post({
        json: { issueId: 'diagnose_worker' }
      });
      const result = await res.json();
      
      if (result.success) {
        setWorkerResult({ 
          success: true, 
          message: result.data.isRealImage 
            ? 'Worker 成功生成缩略图 (GET Request)' 
            : 'Worker 响应成功 (Head Request)', 
          latency: result.data.latency,
          status: result.data.status,
          statusText: result.data.statusText,
          url: result.data.url,
          contentType: result.data.contentType,
          isRealImage: result.data.isRealImage
        });
        toast.success('Worker 连通性测试成功');
      } else {
        setWorkerResult({ 
          success: false, 
          message: result.error || 'Worker 检查失败' 
        });
        toast.error('Worker 配置异常');
      }
    } catch (e: any) {
      setWorkerResult({ 
        success: false, 
        message: `API 请求失败: ${e.message}` 
      });
    } finally {
      setIsTestingWorker(false);
    }
  };

  const handleBackfillPhotoMetadata = async () => {
    if (!confirm('确定要执行旧照片元数据的批量自动提取、补全与多语言翻译吗？系统将从 R2 获取高保真物理尺寸，并进行智能命名和翻译补全，且绝对不覆盖您已人工编辑的数据。')) return;
    setIsBackfilling(true);
    setBackfillProgress(null);

    let currentProcessed = 0;
    let remaining = 999;

    try {
      while (remaining > 0) {
        // [APF-CONTRACT] Invoke backfill endpoint strictly via RPC proxy
        const response = await api.admin['backfill-photo-metadata'].$post({
          json: { limit: 5 }
        });

        if (!response.ok) {
          throw new Error(`HTTP 异常 ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || '服务器处理意外中断');
        }

        currentProcessed += data.processed;
        remaining = data.totalRemaining;

        setBackfillProgress({
          processed: currentProcessed,
          totalRemaining: remaining,
          results: data.results || []
        });

        if (data.processed === 0 || remaining === 0) {
          break;
        }

        // Delay slightly for smooth transition
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      toast.success('批量补全旧照片元数据及多语言翻译全部完成！');
      scan();
    } catch (e: any) {
      toast.error(`修复已意外中断: ${e.message}`);
    } finally {
      setIsBackfilling(false);
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

      {/* 基础设施诊断 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* R2 存储连通性诊断 */}
        <div className="bg-white border border-brand-navy/5 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-brand-navy tracking-tight">R2 存储及 CDN 连通性</h3>
              <p className="text-xs text-brand-navy/60">验证 Cloudflare R2 读写权限</p>
            </div>
            <button
              onClick={runR2Diagnostics}
              disabled={isDiagnosingR2}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy text-white rounded-xl text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isDiagnosingR2 ? 'animate-spin' : ''}`} />
              测试 R2
            </button>
          </div>

          {r2Result && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              r2Result.success 
                ? 'bg-green-500/5 border-green-500/10 text-green-700' 
                : 'bg-red-500/5 border-red-500/10 text-red-700'
            }`}>
              <div className="mt-0.5">
                {r2Result.success ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold">
                  {r2Result.success ? 'R2 连通性测试通过' : 'R2 状态异常'}
                </h4>
                <div className="text-[10px] mt-1 opacity-80 leading-relaxed font-mono truncate">
                  {r2Result.success ? r2Result.message : `${r2Result.stage}: ${r2Result.error}`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Thumbnail Worker 诊断 */}
        <div className="bg-white border border-brand-navy/5 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-brand-navy tracking-tight">缩略图生成服务</h3>
              <p className="text-xs text-brand-navy/60">验证全局边缘 Worker 响应速度</p>
            </div>
            <button
              onClick={handleTestWorker}
              disabled={isTestingWorker}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold text-white rounded-xl text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isTestingWorker ? 'animate-spin' : ''}`} />
              测试 Worker
            </button>
          </div>

          {workerResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              workerResult.success 
                ? 'bg-brand-gold/5 border-brand-gold/10 text-brand-gold' 
                : 'bg-red-500/5 border-red-500/10 text-red-700'
            }`}>
              <div className="mt-0.5">
                {workerResult.success ? <Zap className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold">
                  {workerResult.success ? 'Worker 运行正常' : 'Worker 配置异常'}
                </h4>
                <div className="text-[10px] mt-1 opacity-80 leading-relaxed font-mono">
                  {workerResult.message} {workerResult.latency && `(${workerResult.latency}ms)`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 智能故障修复列表 */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {report?.issues.map((issue) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-brand-navy/5 rounded-2xl overflow-hidden shadow-sm hover:border-brand-navy/10 transition-colors"
            >
              <div className="p-4 flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${severityColors[issue.severity]}`}>
                  {issue.severity === 'P0' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase border ${severityColors[issue.severity]}`}>
                      {issue.severity}
                    </span>
                    <h3 className="text-sm font-bold text-brand-navy">{issue.title}</h3>
                  </div>
                  <p className="text-xs text-brand-navy/60 mb-3">{issue.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-brand-navy/40 px-2 py-1 bg-brand-navy/5 rounded-lg">
                         受影响: {issue.affectedCount}
                       </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {issue.autoFixable && (
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
          <div className="flex items-center gap-2 px-1">
            <CloudDownload size={14} className="text-blue-500" />
            <h4 className="text-xs font-black text-slate-700">云端存储与同步</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ToolButton 
              title="图片对账审计" 
              desc="审计 R2 与数据库一致性"
              icon={<PackageSearch size={16} />}
              onClick={handleAudit}
              loading={isAuditing}
              color="blue"
            />
            <ToolButton 
              title="恢复孤儿照片" 
              desc="找回丢失的云端记录"
              icon={<CloudDownload size={16} />}
              onClick={handleImportOrphans}
              loading={isAuditing}
              color="green"
            />
            <ToolButton 
              title="深度清理存储" 
              desc="移除 R2 无主文件"
              icon={<Trash2 size={16} />}
              onClick={handleDeepCleanStorage}
              loading={isDeepCleaningStorage}
              color="red"
            />
          </div>
        </div>

        {/* 第二组：数据库规范 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Fingerprint size={14} className="text-brand-navy" />
            <h4 className="text-xs font-black text-slate-700">数据质量规范</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ToolButton 
              title="URL 标准化" 
              desc="修复图片链接前缀"
              icon={<RefreshCw size={16} />}
              onClick={handleBulkFixUrls}
              loading={isAuditing}
              color="navy"
            />
            <ToolButton 
              title="资产去重排重" 
              desc="合并重复哈希记录"
              icon={<Fingerprint size={16} />}
              onClick={handleDeduplicate}
              loading={isDeduplicating}
              color="purple"
            />
            <ToolButton 
              title="修复元数据" 
              desc="AI 批量翻译与修复"
              icon={<Zap size={16} />}
              onClick={handleBackfillPhotoMetadata}
              loading={isBackfilling}
              color="indigo"
            />
          </div>
        </div>

        {/* 第三组：系统架构演进 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <ShieldAlert size={14} className="text-amber-500" />
            <h4 className="text-xs font-black text-slate-700">系统架构演进</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ToolButton 
              title="规范系统编号" 
              desc="统一 X-XXXXXXXX 格式"
              icon={<Fingerprint size={16} />}
              onClick={handleNormalizeItemCodes}
              loading={isNormalizingCodes}
              color="orange"
            />
            <ToolButton 
              title="物理路径 UUID 化" 
              desc="转换 temp-xxx 路径"
              icon={<RefreshCw size={16} />}
              onClick={handleCleanupTempUrls}
              loading={isCleaningTemp}
              color="amber"
            />
            <ToolButton 
              title="清理冗余记录" 
              desc="移除重复 URL 脏数据"
              icon={<Trash2 size={16} />}
              onClick={handleCleanupRedundant}
              loading={isCleaningRedundant}
              color="red"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ title, desc, icon, onClick, loading, color }: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading: boolean;
  color: 'blue' | 'green' | 'red' | 'navy' | 'purple' | 'indigo' | 'orange' | 'amber';
}) {
  const colorMap = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100',
    green: 'bg-green-50 hover:bg-green-100 text-green-600 border-green-100',
    red: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100',
    navy: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-600 border-purple-100',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-100',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-100',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex flex-col gap-2 p-4 rounded-2xl border transition-all active:scale-95 text-left group ${colorMap[color as keyof typeof colorMap]} disabled:opacity-50`}
    >
      <div className="flex items-center gap-2">
        <div className="p-2 bg-white/50 rounded-lg shadow-sm">
          {icon}
        </div>
        <span className="text-xs font-black tracking-tight">{title}</span>
      </div>
      <p className="text-[9px] opacity-70 uppercase font-bold tracking-wider leading-tight">{desc}</p>
      {loading && <div className="mt-1 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
        <span className="text-[10px] font-black animate-pulse uppercase">处理中...</span>
      </div>}
    </button>
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
