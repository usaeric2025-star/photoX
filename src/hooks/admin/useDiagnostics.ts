import { STALE_TIMES } from '#lib/query/config';
import { useAppMutation, useAppQuery, appQuery } from '#lib/query';
import { api } from '#lib/api';
import { queryKeys } from '#lib/query/keys';
import { useUI, UIStoreState } from '#lib/store';
import { executeTask } from '#lib/task-queue';
import { useTranslation } from '#src/hooks';

/**
 * useDiagnostics
 * Handles infrastructure and storage maintenance tasks
 */
export function useDiagnostics() {
  const { uiTranslations: t } = useTranslation();

  const { data: auditResult, isValidating: isAuditing } = useAppQuery(
    null, // manually triggered
    async () => {
      const res = await api.admin.maintenance.storage.audit.$get();
      const data = await res.json() as { success: boolean; data?: unknown; error?: string };
      if (!data.success) throw new Error(data.error || t.storageAuditFailed);
      return data.data;
    },
    { dedupingInterval: STALE_TIMES.SHORT * 5 }
  );

  const runAudit = async () => {
    return executeTask({
      label: t.storageAuditComplete,
      type: 'repair',
      execute: async (signal, onProgress) => {
        onProgress(0, t.diagnosing);
        const res = await api.admin.maintenance.storage.audit.$get();
        const data = await res.json() as { success: boolean; data?: unknown; error?: string };
        if (!data.success) throw new Error(data.error || t.storageAuditFailed);
        onProgress(1, t.storageAuditComplete);
        return data.data;
      }
    });
  };

  const { isMutating: isCleaning, trigger: deduplicate } = useAppMutation(
    {
      mutationFn: async () => {
        return executeTask({
          label: t.deduplicateComplete(0).split('!')[0],
          type: 'repair',
          execute: async (signal, onProgress) => {
            onProgress(0, t.processing);
            const res = await api.admin.maintenance.storage.deduplicate.$post();
            const json = await res.json() as { success: boolean; error?: string };
            if (!json.success) throw new Error(json.error || t.mutationFailed);
            
            appQuery.mutate((key) => {
              if (!key) return false;
              const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
              return keyStr.includes('photos');
            });
            onProgress(1, t.deduplicateComplete(0));
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
        label: t.systemMaint,
        type: 'repair',
        execute: async (signal, onProgress) => {
          onProgress(0, t.diagnosing);
          const res = await api.admin.maintenance['daily-cleanup'].$post();
          const data = await res.json() as { success: boolean; data?: unknown; error?: string };
          if (!data.success) throw new Error(data.error || t.mutationFailed);
          onProgress(1, t.diagHealthy);
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
