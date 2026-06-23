import { STALE_TIMES } from '@/lib/query/config';
import { useAppMutation, useAppQuery, appQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import { useTaskExecutor } from '../core/useTaskExecutor';
import { useUI } from '@/lib/store';

/**
 * useDiagnostics
 * Handles infrastructure and storage maintenance tasks
 */
export function useDiagnostics() {
  const { runTask } = useTaskExecutor();
  const appLang = useUI(s => s.appLang);

  const { data: auditResult, isValidating: isAuditing, mutate: runAuditQuery } = useAppQuery(
    null, // manually triggered
    async () => {
      const res = await api.admin.maintenance.storage.audit.$get();
      const data = await res.json() as { success: boolean; data?: any; error?: string };
      if (!data.success) throw new Error(data.error || '對賬審計失敗');
      return data.data;
    },
    { dedupingInterval: STALE_TIMES.SHORT * 5 }
  );

  const runAudit = async () => {
    return runTask(
      appLang === 'zh' ? '存儲對賬審計' : 'Storage Audit',
      async () => {
        // Since key is null we override fetcher directly or simply just call the API here.
        // But we wait, to trigger a null-key query, we should just call fetcher.
        const res = await api.admin.maintenance.storage.audit.$get();
        const data = await res.json() as { success: boolean; data?: any; error?: string };
        if (!data.success) throw new Error(data.error || '對賬審計失敗');
        // Manually update the cache if we had a proper key, but here we can just return it.
        return data.data;
      }
    );
  };

  const { isMutating: isCleaning, trigger: deduplicate } = useAppMutation(
    async () => {
      return runTask(
        appLang === 'zh' ? '執行數據去重' : 'Deduplicate Records',
        async () => {
          const res = await api.admin.maintenance.storage.deduplicate.$post();
          const json = await res.json() as any;
          if (!json.success) throw new Error(json.error || '去重失敗');
          return json;
        }
      );
    },
    {
      onSuccess: () => {
        appQuery.mutate(queryKeys.photos.all);
      }
    }
  );

  return {
    isPending: isAuditing || isCleaning,
    runRepair: async (id: string) => {
        if (id === 'deduplicate') return deduplicate({});
        throw new Error('Unsupported repair action');
    },
    runAudit,
    isAuditing,
    auditResult: auditResult || null,
    runDailyCleanup: async () => {
      return runTask(
        appLang === 'zh' ? '執行全域維護清理 (Daily Cleanup)' : 'Run Daily Maintenance',
        async () => {
          const res = await api.admin.maintenance['daily-cleanup'].$post();
          const data = await res.json() as { success: boolean; data?: unknown; error?: string };
          if (!data.success) throw new Error(data.error || 'Cleanup failed');
          return data;
        }
      );
    },
    report: { issues: [] }, // Compatibility layer
    refreshReport: () => {
        appQuery.mutate(queryKeys.diagnostics.all);
    }
  };
}
