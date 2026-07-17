import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { executeTask } from '#lib/task-queue/index.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useInvalidatePhotos } from '#src/hooks/photo/useInvalidatePhotos.js';

/**
 * useSystemMaintenance
 * 
 * 處理系統診斷、修復與維護任務。
 */
export function useSystemMaintenance() {
  const { t, uiTranslations: labels } = useTranslation();
  const { invalidateList } = useInvalidatePhotos();

  const { data: auditResult, isFetching: isAuditing, refetch: runAuditQuery } = useAppQuery(
    ['admin', 'maintenance', 'audit'],
    async () => ErrorFactory.unwrap<unknown>(api.admin.maintenance.storage.audit.$get(), labels.storageAuditFailed),
    { 
      staleTime: STALE_TIMES.SHORT * 5,
      enabled: false // 僅手動觸發
    }
  );

  const runAudit = async () => {
    return executeTask({
      label: labels.storageAuditComplete,
      type: 'repair',
      execute: async (signal, onProgress) => {
        onProgress(0, labels.diagnosing);
        const data = await runAuditQuery();
        onProgress(1, labels.storageAuditComplete);
        return data;
      }
    });
  };

  const { isPending: isDeduplicating, mutate: deduplicate } = useAppMutation({
    mutationFn: async () => {
      return executeTask({
        label: t('deduplicateComplete', 0).split('!')[0],
        type: 'repair',
        execute: async (signal, onProgress) => {
          onProgress(0, labels.processing);
          const data = await ErrorFactory.unwrap<unknown>(api.admin.maintenance.storage.deduplicate.$post(), labels.mutationFailed);
          invalidateList();
          onProgress(1, t('deduplicateComplete', 0));
          return data;
        }
      });
    }
  });

  const runDailyCleanup = async () => {
    return executeTask({
      label: labels.systemMaint,
      type: 'repair',
      execute: async (signal, onProgress) => {
        onProgress(0, labels.processing);
        const data = await ErrorFactory.unwrap<unknown>(api.admin.maintenance['daily-cleanup'].$post(), labels.mutationFailed);
        onProgress(1, labels.diagHealthy);
        return data;
      }
    });
  };

  return {
    auditResult: auditResult || null,
    isAuditing,
    runAudit,
    deduplicate,
    isDeduplicating,
    runDailyCleanup
  };
}
