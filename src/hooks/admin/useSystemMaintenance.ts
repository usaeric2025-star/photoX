import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { userAtom } from '#src/store/index.js';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { executeTask, createTask } from '#lib/task-queue/index.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useInvalidatePhotos } from '#src/hooks/photo/index.js';
import { ISSUE_ACTIONS, PreviewResult } from "#src/features/diagnostics/issueActions.js";

/**
 * useSystemMaintenance
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
      enabled: false 
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

/**
 * useMaintenanceExecution
 */
export function useMaintenanceExecution(issueId: string, title: string, onSuccess?: () => void) {
  const { t } = useTranslation();
  const user = useAtomValue(userAtom);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);

  const action = ISSUE_ACTIONS[issueId];

  const handlePreview = async () => {
    if (!action) return;
    setIsPreviewing(true);
    try {
      const result = await action.preview?.();
      setPreview(result || null);
      if (result && result.affectedPhotos && result.affectedPhotos.length > 0) {
        setShowPreviewDialog(true);
      }
    } catch (e: unknown) {
      ErrorFactory.handle(e, { context: t('previewAction') });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecute = () => {
    setIsExecuting(true);
    setProgress(0);
    
    createTask({
      type: 'repair',
      label: title,
      userId: user?.id,
      execute: async (signal, onProgress) => {
        const update = (p: number, msg?: string) => {
          onProgress(p, msg);
          setProgress(p * 100);
        };
        update(0.1, t('initializing'));
        const result = await action.execute(update);
        update(1, t('completed'));
        return result;
      },
      onComplete: () => {
        setIsExecuting(false);
        setPreview(null);
        setProgress(0);
        if (onSuccess) onSuccess();
      },
      onError: () => {
        setIsExecuting(false);
      }
    });
  };

  return {
    preview, setPreview,
    showPreviewDialog, setShowPreviewDialog,
    isExecuting, isPreviewing, progress,
    handlePreview, handleExecute, action
  };
}
