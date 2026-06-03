import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fromThrowableAsync } from '@/lib/errorFactory';
import { toast } from 'sonner';
import { DiagnosticsReport } from '@/types/diagnostics';

/**
 * [ATOMIC-HOOK] useDiagnostics
 * Handles infrastructure and data integrity diagnostics
 */
export function useDiagnostics() {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [r2Result, setR2Result] = useState<any | null>(null);
  const [isDiagnosingR2, setIsDiagnosingR2] = useState(false);
  const [isTestingWorker, setIsTestingWorker] = useState(false);
  const [workerResult, setWorkerResult] = useState<any | null>(null);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const queryClient = useQueryClient();

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await api.storage.audit.$get();
      const data = await res.json() as any;
      if (data.success) {
        setAuditResult(data.data);
      } else {
        toast.error('对账审计失败');
      }
    } catch (e: any) {
      toast.error(`审计错误: ${e.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const { isPending: isRepairing, mutate: repair } = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await api.admin.repair.$post({ json: { issueId } });
      if (!res.ok) {
        const errorData = await res.json() as any;
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }
      return res.json() as any;
    },
    onSuccess: (data) => {
      toast.success(data.message || "修复成功");
      queryClient.invalidateQueries({ queryKey: [['photos'], ['groups']] });
      refreshReport();
    },
    onError: (err: any) => toast.error(`修复尝试失败: ${err.message}`)
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

  const refreshReport = () => scan();

  const runR2Diagnostics = async () => {
    setIsDiagnosingR2(true);
    const result = await fromThrowableAsync(() => api.admin['diagnose-r2'].$get(), 'diagnoseR2');
    if (!result.ok) {
      toast.error('R2 诊断接口异常');
      setIsDiagnosingR2(false);
      return;
    }
    const res = result.data as Response;
    if (res.ok) {
      const data = await res.json();
      setR2Result(data);
      if (data.success) toast.success('R2 存储连接测试成功');
      else toast.error('R2 存储测试未通过');
    }
    setIsDiagnosingR2(false);
  };

  const handleTestWorker = async () => {
    setIsTestingWorker(true);
    try {
      const res = await api.admin.repair.$post({ json: { issueId: 'diagnose_worker' } });
      const result = await res.json();
      if (result.success) {
        setWorkerResult({ 
          success: true, 
          message: result.data.isRealImage ? 'Worker 成功生成缩略图' : 'Worker 响应成功',
          latency: result.data.latency 
        });
        toast.success('Worker 连通性测试成功');
      } else {
        setWorkerResult({ success: false, message: result.error || 'Worker 检查失败' });
      }
    } catch (e: any) {
      setWorkerResult({ success: false, message: e.message });
    } finally {
      setIsTestingWorker(false);
    }
  };

  useEffect(() => {
    refreshReport();
    runR2Diagnostics();
    runAudit();
  }, []);

  return {
    report,
    isLoading: isScanning || isRepairing || isAuditing,
    error,
    refreshReport,
    runRepair: repair,
    runR2Diagnostics,
    isDiagnosingR2,
    r2Result,
    handleTestWorker,
    isTestingWorker,
    workerResult,
    runAudit,
    isAuditing,
    auditResult
  };
}
