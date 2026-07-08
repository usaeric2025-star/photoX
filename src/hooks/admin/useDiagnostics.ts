import { STALE_TIMES } from '#lib/query/config.js';
import { useAppMutation, useAppQuery, queryClient } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { queryKeys } from '#lib/query/keys.js';
import { useUI, UIStoreState } from '#lib/store/index.js';
import { executeTask } from '#lib/task-queue/index.js';
import { useTranslation } from '../core/index.js';

/**
 * useDiagnostics
 * Handles infrastructure and storage maintenance tasks
 */
export function useDiagnostics() {
  const { t, uiTranslations: labels } = useTranslation();

  const { data: auditResult, isFetching: isAuditing } = useAppQuery(
    null, // manually triggered
    async () => {
      const res = await api.admin.maintenance.storage.audit.$get();
      const data = await res.json() as { success: boolean; data?: unknown; error?: string };
      if (!data.success) throw new Error(data.error || labels.storageAuditFailed);
      return data.data;
    },
    { staleTime: STALE_TIMES.SHORT * 5 }
  );

  const runAudit = async () => {
    return executeTask({
      label: labels.storageAuditComplete,
      type: 'repair',
      execute: async (signal, onProgress) => {
        onProgress(0, labels.diagnosing);
        const res = await api.admin.maintenance.storage.audit.$get();
        const data = await res.json() as { success: boolean; data?: unknown; error?: string };
        if (!data.success) throw new Error(data.error || labels.storageAuditFailed);
        onProgress(1, labels.storageAuditComplete);
        return data.data;
      }
    });
  };

  const { isPending: isCleaning, mutate: deduplicate } = useAppMutation(
    {
      mutationFn: async () => {
        return executeTask({
          label: t('deduplicateComplete', 0).split('!')[0],
          type: 'repair',
          execute: async (signal, onProgress) => {
            onProgress(0, labels.processing);
            const res = await api.admin.maintenance.storage.deduplicate.$post();
            const json = await res.json() as { success: boolean; error?: string };
            if (!json.success) throw new Error(json.error || labels.mutationFailed);
            
            queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
            onProgress(1, t('deduplicateComplete', 0));
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
        label: labels.systemMaint,
        type: 'repair',
        execute: async (signal, onProgress) => {
          onProgress(0, labels.diagnosing);
          const res = await api.admin.maintenance['daily-cleanup'].$post();
          const data = await res.json() as { success: boolean; data?: unknown; error?: string };
          if (!data.success) throw new Error(data.error || labels.mutationFailed);
          onProgress(1, labels.diagHealthy);
          return data;
        }
      });
    },
    report: { issues: [] }, // Compatibility layer
    refreshReport: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostics.all });
    }
  };
}
