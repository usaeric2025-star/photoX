import { STALE_TIMES } from '@/lib/query/config';
import { useAppMutation, useAppQuery, appQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import { useUI } from '@/lib/store';
import { toast } from 'sonner';

/**
 * useDiagnostics
 * Handles infrastructure and storage maintenance tasks
 */
export function useDiagnostics() {
  const appLang = useUI(s => s.appLang);

  const { data: auditResult, isValidating: isAuditing, mutate: runAuditQuery } = useAppQuery(
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
    toast.loading(appLang === 'zh' ? '正在進行存儲對賬審計...' : 'Storage Audit...');
    try {
        const res = await api.admin.maintenance.storage.audit.$get();
        const data = await res.json() as { success: boolean; data?: unknown; error?: string };
        if (!data.success) throw new Error(data.error || '對賬審計失敗');
        toast.success(appLang === 'zh' ? '審計完成' : 'Audit complete');
        return data.data;
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  const { isMutating: isCleaning, trigger: deduplicate } = useAppMutation(
    {
      mutationFn: async () => {
        toast.loading(appLang === 'zh' ? '正在執行數據去重...' : 'Deduplicating...');
        const res = await api.admin.maintenance.storage.deduplicate.$post();
        const json = await res.json() as { success: boolean; error?: string };
        if (!json.success) throw new Error(json.error || '去重失敗');
        return json;
      },
      onSuccess: () => {
        appQuery.mutate(queryKeys.photos.all);
        toast.success(appLang === 'zh' ? '去重完成' : 'Deduplication complete');
      },
      onError: (e: any) => {
        toast.error(e.message);
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
      toast.loading(appLang === 'zh' ? '正在執行全域維護清理...' : 'Running cleanup...');
      try {
        const res = await api.admin.maintenance['daily-cleanup'].$post();
        const data = await res.json() as { success: boolean; data?: unknown; error?: string };
        if (!data.success) throw new Error(data.error || 'Cleanup failed');
        toast.success(appLang === 'zh' ? '清理完成' : 'Cleanup complete');
        return data;
      } catch (e: any) {
        toast.error(e.message);
      }
    },
    report: { issues: [] }, // Compatibility layer
    refreshReport: () => {
        appQuery.mutate(queryKeys.diagnostics.all);
    }
  };
}
