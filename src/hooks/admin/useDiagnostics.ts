import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fromThrowableAsync, ErrorFactory } from '@/lib/error/ErrorFactory';
import { toast } from 'sonner';
import { DiagnosticsReport } from '@/types/diagnostics';
import { photoKeys, groupKeys } from '@/lib/queryKeys';

/**
 * [ATOMIC-HOOK] useDiagnostics
 * Handles infrastructure and data integrity diagnostics
 */
export function useDiagnostics() {
  const queryClient = useQueryClient();

  const { data: auditResult, isLoading: isAuditing, refetch: runAudit } = useQuery({
    queryKey: ['diagnostics', 'audit'],
    queryFn: async () => {
      const res = await api.storage.audit.$get();
      const data = await res.json() as any;
      if (!data.success) {
        toast.error('对账审计失败');
        throw new Error('对账审计失败');
      }
      return data.data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const { isPending: isRepairing, mutate: repair } = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await api.admin.repair.$post({ json: { issueId } });
      if (!res.ok) {
        const errorData = await res.json() as any;
        throw ErrorFactory.wrap(new Error(errorData?.error || `HTTP ${res.status}`), 'runRepair', issueId);
      }
      return res.json() as any;
    },
    onSuccess: (data) => {
      toast.success(data.message || "修复成功");
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
      queryClient.invalidateQueries({ queryKey: ['diagnostics'] });
    },
    onError: (err: any) => toast.error(`修复尝试失败: ${err.message}`)
  });

  const { data: report, isLoading: isScanning, error: scanErrorObj, refetch: scan } = useQuery({
    queryKey: ['diagnostics', 'report'],
    queryFn: async () => {
      const res = await api.admin.diagnose.$get();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json() as unknown as DiagnosticsReport;
    },
    retry: false,
  });

  const scanError = scanErrorObj ? `扫描失败: ${(scanErrorObj as Error).message}` : null;

  const refreshReport = () => {
    scan();
    queryClient.invalidateQueries({ queryKey: photoKeys.all });
    queryClient.invalidateQueries({ queryKey: groupKeys.all });
  };

  const { data: r2Result, isLoading: isDiagnosingR2, refetch: runR2DiagnosticsQuery } = useQuery({
    queryKey: ['diagnostics', 'r2'],
    queryFn: async () => {
      const result = await fromThrowableAsync(() => api.admin['diagnose-r2'].$get(), 'diagnoseR2');
      if (!result.ok) {
        toast.error('R2 诊断接口异常');
        throw new Error('R2 诊断接口异常');
      }
      const res = result.data as Response;
      if (!res.ok) {
        throw new Error('R2 存储测试未通过');
      }
      const data = await res.json();
      if (data.success) {
        toast.success('R2 存储连接测试成功');
      } else {
        toast.error('R2 存储测试未通过');
      }
      return data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const runR2Diagnostics = () => {
    runR2DiagnosticsQuery();
  };

  const [isTestingWorker, setIsTestingWorker] = useState(false);
  const [workerResult, setWorkerResult] = useState<any | null>(null);

  const handleTestWorker = async () => {
    setIsTestingWorker(true);
    try {
      const res = await api.admin.repair.$post({ json: { issueId: 'diagnose_worker' } });
      const result = await res.json() as any;
      if (result.success) {
        setWorkerResult({ 
          success: true, 
          message: result.data?.isRealImage ? 'Worker 成功生成缩略图' : 'Worker 响应成功',
          latency: result.data?.latency 
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

  return {
    report: report || null,
    isLoading: isScanning || isRepairing || isAuditing,
    error: scanError,
    refreshReport,
    runRepair: repair,
    runR2Diagnostics,
    isDiagnosingR2,
    r2Result: r2Result || null,
    handleTestWorker,
    isTestingWorker,
    workerResult,
    runAudit: () => runAudit(),
    isAuditing,
    auditResult: auditResult || null
  };
}
