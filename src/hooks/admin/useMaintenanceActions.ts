import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { deduplicatePhotos, bulkFixPhotoUrls } from "@/services/photo/photoMaintenanceService";

/**
 * [ATOMIC-HOOK] useMaintenanceActions
 * Handles specific data repair and maintenance tools
 */
export function useMaintenanceActions(onSuccess?: () => void) {
  const { user } = useAuth();
  const update = useUIStore(s => s.update);
  
  const [isAuditing, setIsAuditing] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isNormalizingCodes, setIsNormalizingCodes] = useState(false);
  const [isCleaningTemp, setIsCleaningTemp] = useState(false);
  const [isCleaningRedundant, setIsCleaningRedundant] = useState(false);
  const [isDeepCleaningStorage, setIsDeepCleaningStorage] = useState(false);

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await api.storage.audit.$get();
      const data = await res.json() as any;
      if (data.success) toast.success("存储对账完成");
    } catch (e: any) {
      toast.error(`对账失败: ${e.message}`, e.stack);
    } finally { setIsAuditing(false); }
  };

  const handleImportOrphans = async () => {
    setIsAuditing(true);
    try {
      let query: { userId?: string } | undefined;
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          query = { userId: session.user.id };
        }
      } catch (e) {
        console.warn("[handleImportOrphans] Failed to retrieve session:", e);
      }

      const res = await api.storage['import-orphans'].$post(query ? { query } : undefined);
      const data = await res.json() as any;
      if (data.success) {
        toast.success(data.message || "恢复完成");
        onSuccess?.();
      }
    } catch (e: any) {
      toast.error(`恢复失败: ${e.message}`, e.stack);
    } finally { setIsAuditing(false); }
  };

  const executeBulkFixUrls = async () => {
    setIsAuditing(true);
    try {
      const result = await bulkFixPhotoUrls();
      toast.success(`修复完成：${result.updated || 0} 更新`);
      onSuccess?.();
    } finally { setIsAuditing(false); }
  };

  const executeDeduplicate = async (userId: string) => {
    setIsDeduplicating(true);
    try {
      const result = await deduplicatePhotos(userId);
      if (result.ok) {
        toast.success(`排重完成！共清理了 ${result.data.removed} 张重复记录。`);
        onSuccess?.();
      }
    } finally { setIsDeduplicating(false); }
  };

  const executeBackfillPhotoMetadata = async () => {
    setIsBackfilling(true);
    try {
      const response = await api.admin['backfill-photo-metadata'].$post({ json: { limit: 20 } });
      const data = await response.json() as any;
      if (data.success) {
        toast.success(`成功补全 ${data.processed} 条记录`);
        onSuccess?.();
      }
    } catch (e: any) { toast.error(e.message, e.stack); }
    finally { setIsBackfilling(false); }
  };

  const executeNormalizeItemCodes = async () => {
    setIsNormalizingCodes(true);
    try {
      const res = await api.admin.repair.$post({ json: { issueId: 'non_standard_item_codes' } });
      const data = await res.json() as any;
      if (data.success) {
        toast.success(data.message || "修复成功");
        onSuccess?.();
      }
    } finally { setIsNormalizingCodes(false); }
  };

  const executeCleanupTempUrls = async () => {
    setIsCleaningTemp(true);
    try {
      const res = await api.admin.repair.$post({ json: { issueId: 'cleanup_temp_urls' } });
      const data = await res.json() as any;
      if (data.success) {
        toast.success(data.message || "修复成功");
        onSuccess?.();
      }
    } finally { setIsCleaningTemp(false); }
  };

  const executeCleanupRedundant = async () => {
    setIsCleaningRedundant(true);
    try {
      const res = await api.admin.repair.$post({ json: { issueId: 'cleanup_redundant' } });
      const data = await res.json() as any;
      if (data.success) {
        toast.success(data.message || "修复成功");
        onSuccess?.();
      }
    } finally { setIsCleaningRedundant(false); }
  };

  const executeDeepCleanStorage = async () => {
    setIsDeepCleaningStorage(true);
    try {
      const res = await api.storage.clean.$post();
      const data = await res.json() as any;
      if (data.success) {
        toast.success(`清理完成，共移除 ${data.count} 个文件`);
      }
    } finally { setIsDeepCleaningStorage(false); }
  };

  return {
    handleAudit, isAuditing,
    handleImportOrphans,
    executeBulkFixUrls,
    executeDeduplicate, isDeduplicating,
    executeBackfillPhotoMetadata, isBackfilling,
    executeNormalizeItemCodes, isNormalizingCodes,
    executeCleanupTempUrls, isCleaningTemp,
    executeCleanupRedundant, isCleaningRedundant,
    executeDeepCleanStorage, isDeepCleaningStorage
  };
}
