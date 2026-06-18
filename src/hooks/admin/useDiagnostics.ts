import { STALE_TIMES } from '@/lib/query/config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { DiagnosticsReport } from '@/types/diagnostics';
import { queryKeys } from '@/lib/query/keys';
import { useTaskExecutor } from '../core/useTaskExecutor';
import { useUIStore } from '@/store/useUIStore';

/**
 * [ATOMIC-HOOK] useDiagnostics
 * Handles infrastructure and data integrity diagnostics
 */
export function useDiagnostics() {
  const queryClient = useQueryClient();
  const { runTask } = useTaskExecutor();
  const appLang = useUIStore(s => s.appLang);

  const { data: auditResult, isFetching: isAuditing, refetch: runAuditQuery } = useQuery({
    queryKey: queryKeys.diagnostics.audit(),
    queryFn: async () => {
      const res = await api.storage.audit.$get();
      const data = await res.json() as any;
      if (!data.success) throw new Error('对账审计失败');
      return data.data;
    },
    enabled: false,
    retry: false,
    staleTime: STALE_TIMES.SHORT* 5,
  });

  const runAudit = async () => {
    return runTask(
      appLang === 'zh' ? '存储对账审计' : 'Storage Audit',
      async () => {
        const { data } = await runAuditQuery();
        return data;
      }
    );
  };

  const { isPending: isRepairing, mutate: repair } = useMutation({
    mutationFn: async (issueId: string) => {
      return runTask(
        appLang === 'zh' ? `修复故障: ${issueId}` : `Repair Issue: ${issueId}`,
        async () => {
          const res = await api.admin.repair.$post({ json: { issueId } });
          if (!res.ok) {
            const errorData = await res.json() as any;
            throw ErrorFactory.wrap(new Error(errorData?.error || `HTTP ${res.status}`), 'runRepair', issueId);
          }
          return res.json() as any;
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.diagnostics.all });
    }
  });

  const { data: report, isPending: isScanning, refetch: scan } = useQuery({
    queryKey: queryKeys.diagnostics.report(),
    queryFn: async () => {
      const res = await api.admin.diagnose.$get();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json() as unknown as DiagnosticsReport;
    },
    refetchOnWindowFocus: false, // Prevent background refetches on focus
    refetchOnReconnect: false,   // Prevent background refetches on reconnect
    retry: false,
    staleTime: STALE_TIMES.GROUP_DETAIL
  });

  const refreshReport = () => {
    scan();
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  };

  const { data: r2Result, isFetching: isDiagnosingR2, refetch: runR2DiagnosticsQuery } = useQuery({
    queryKey: queryKeys.diagnostics.r2(),
    queryFn: async () => {
      const res = await api.admin.diagnose.r2.$get();
      if (!res.ok) throw new Error('R2 存储测试未通过');
      const data = await res.json() as any;
      if (!data.success) throw new Error(data.error || 'R2 存储测试未通过');
      return data;
    },
    enabled: false,
    retry: false,
    staleTime: STALE_TIMES.SHORT* 5,
  });

  const runR2Diagnostics = () => {
    runTask(
      appLang === 'zh' ? 'R2 连通性诊断' : 'R2 Connectivity Diagnosis',
      async () => {
        const { data } = await runR2DiagnosticsQuery();
        return data;
      }
    );
  };

  const handleTestWorker = async () => {
    return runTask(
      appLang === 'zh' ? 'Worker 性能测试' : 'Worker Performance Test',
      async () => {
        const res = await api.admin.repair.$post({ json: { issueId: 'diagnose_worker' } });
        const result = await res.json() as any;
        if (!result.success) throw new Error(result.error || 'Worker 检查失败');
        return result.data;
      }
    );
  };

  return {
    report: report || null,
    isPending: isScanning || isRepairing || isAuditing,
    refreshReport,
    runRepair: (id: string) => repair(id),
    runR2Diagnostics,
    isDiagnosingR2,
    r2Result: r2Result || null,
    handleTestWorker,
    isTestingWorker: false, // Managed by TaskExecutor
    workerResult: null, // Managed by TaskExecutor
    runAudit,
    isAuditing,
    auditResult: auditResult || null,
    runDailyCleanup: async () => {
      return runTask(
        appLang === 'zh' ? '執行全域維護清理 (Daily Cleanup)' : 'Run Daily Maintenance',
        async () => {
          const res = await api.admin.maintenance['daily-cleanup'].$post();
          const data = await res.json() as any;
          if (!data.success) throw new Error(data.error || 'Cleanup failed');
          return data;
        }
      );
    }
  };
}
