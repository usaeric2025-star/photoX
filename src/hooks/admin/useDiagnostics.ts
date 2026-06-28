import { STALE_TIMES } from '@/lib/query/config';
import { useAppMutation, useAppQuery, appQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import { useUI, UIStoreState } from '@/lib/store';
import { executeTask } from '@/lib/task-queue';

/**
 * useDiagnostics
 * Handles infrastructure and storage maintenance tasks
 */
export function useDiagnostics() {
  const appLang = useUI((s: UIStoreState) => s.appLang);

  const { data: auditResult, isValidating: isAuditing } = useAppQuery(
    null, // manually triggered
    async () => {
      const res = await api.admin.maintenance.storage.audit.$get();
      const data = await res.json() as { success: boolean; data?: unknown; error?: string };
      if (!data.success) throw new Error(data.error || '對賬審計失敗');
      return data.data;
    },
    { dedupingInterval: STALE_TIMES.SHORT * 5 }
  );

  const runAudit = async () => {
    return executeTask({
      label: appLang === 'zh' ? '存儲對賬審計' : 'Storage Audit',
      type: 'repair',
      execute: async (signal, onProgress) => {
        onProgress(0, appLang === 'zh' ? '正在進行存儲對賬審計...' : 'Auditing storage...');
        const res = await api.admin.maintenance.storage.audit.$get();
        const data = await res.json() as { success: boolean; data?: unknown; error?: string };
        if (!data.success) throw new Error(data.error || '對賬審計失敗');
        onProgress(1, appLang === 'zh' ? '審計完成' : 'Audit complete');
        return data.data;
      }
    });
  };

  const { isMutating: isCleaning, trigger: deduplicate } = useAppMutation(
    {
      mutationFn: async () => {
        return executeTask({
          label: appLang === 'zh' ? '數據去重' : 'Data Deduplication',
          type: 'repair',
          execute: async (signal, onProgress) => {
            onProgress(0, appLang === 'zh' ? '正在執行數據去重...' : 'Deduplicating...');
            const res = await api.admin.maintenance.storage.deduplicate.$post();
            const json = await res.json() as { success: boolean; error?: string };
            if (!json.success) throw new Error(json.error || '去重失敗');
            
            appQuery.mutate((key) => Array.isArray(key) && key[0] === queryKeys.photos.all[0]);
            onProgress(1, appLang === 'zh' ? '去重完成' : 'Deduplication complete');
            return json;
          }
        });
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
      return executeTask({
        label: appLang === 'zh' ? '全域維護清理' : 'Global Maintenance Cleanup',
        type: 'repair',
        execute: async (signal, onProgress) => {
          onProgress(0, appLang === 'zh' ? '正在執行全域維護清理...' : 'Running cleanup...');
          const res = await api.admin.maintenance['daily-cleanup'].$post();
          const data = await res.json() as { success: boolean; data?: unknown; error?: string };
          if (!data.success) throw new Error(data.error || 'Cleanup failed');
          onProgress(1, appLang === 'zh' ? '清理完成' : 'Cleanup complete');
          return data;
        }
      });
    },
    report: { issues: [] }, // Compatibility layer
    refreshReport: () => {
        appQuery.mutate(queryKeys.diagnostics.all);
    }
  };
}
