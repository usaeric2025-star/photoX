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
      toast.error(`对账失败: ${e.message}`);
    } finally { setIsAuditing(false); }
  };

  const handleImportOrphans = async () => {
    setIsAuditing(true);
    try {
      const res = await api.storage['import-orphans'].$post();
      const data = await res.json() as any;
      if (data.success) {
        toast.success(data.message || "恢复完成");
        onSuccess?.();
      }
    } catch (e: any) {
      toast.error(`恢复失败: ${e.message}`);
    } finally { setIsAuditing(false); }
  };

  const handleBulkFixUrls = async () => {
    update({
      alertDialog: {
        title: '确定要将所有图片 URL 标准化吗？',
        message: '此操作将统一所有存量照片的访问路径前缀。',
        onConfirm: async () => {
          setIsAuditing(true);
          try {
            const result = await bulkFixPhotoUrls();
            toast.success(`修复完成：${result.updated} 更新`);
            onSuccess?.();
          } finally { setIsAuditing(false); }
        }
      }
    });
  };

  const handleDeduplicate = async () => {
    if (!user) return toast.error("请先登录");
    update({
      alertDialog: {
        title: '确定要执行排重清理吗？',
        message: '系统将根据图片哈希合并重复的照片记录。此操作不可撤销。',
        type: 'danger',
        confirmLabel: '执行去重',
        onConfirm: async () => {
          setIsDeduplicating(true);
          try {
            const result = await deduplicatePhotos(user.id);
            if (result.ok) {
              toast.success(`排重完成！共清理了 ${result.data.removed} 张重复记录。`);
              onSuccess?.();
            }
          } finally { setIsDeduplicating(false); }
        }
      }
    });
  };

  const handleBackfillPhotoMetadata = async () => {
     update({
       alertDialog: {
         title: '确定要开始批量元数据补全吗？',
         message: '项目包含 AI 识别与多语言翻译，可能需要 1-2 分钟。',
         onConfirm: async () => {
           setIsBackfilling(true);
           try {
             const response = await api.admin['backfill-photo-metadata'].$post({ json: { limit: 20 } });
             const data = await response.json();
             if (data.success) {
               toast.success(`成功补全 ${data.processed} 条记录`);
               onSuccess?.();
             }
           } catch (e: any) { toast.error(e.message); }
           finally { setIsBackfilling(false); }
         }
       }
     });
  };

  const handleNormalizeItemCodes = async () => {
    update({
      alertDialog: {
        title: '确定规范编号格式吗？',
        message: '将所有存量编号统一为 X-XXXXXXXX 格式。',
        onConfirm: async () => {
          setIsNormalizingCodes(true);
          try {
            const res = await api.maintenance['normalize-item-codes'].$post();
            const data = await res.json() as any;
            if (data.success) {
              toast.success(data.message);
              onSuccess?.();
            }
          } finally { setIsNormalizingCodes(false); }
        }
      }
    });
  };

  const handleCleanupTempUrls = async () => {
    update({
      alertDialog: {
        title: '确定要清理临时路径吗？',
        message: '此操作将物理存储路径映射从 temp- 转换为 UUID 规范。',
        onConfirm: async () => {
          setIsCleaningTemp(true);
          try {
            const res = await api.admin.repair.$post({ json: { issueId: 'cleanup_temp_urls' } });
            const data = await res.json() as any;
            if (data.success) {
              toast.success(data.message);
              onSuccess?.();
            }
          } finally { setIsCleaningTemp(false); }
        }
      }
    });
  };

  const handleCleanupRedundant = async () => {
    update({
      alertDialog: {
        title: '确定要清理冗余记录吗？',
        message: '移除数据库中重复的 URL 脏数据。',
        type: 'danger',
        confirmLabel: '执行清理',
        onConfirm: async () => {
          setIsCleaningRedundant(true);
          try {
            const res = await api.admin.repair.$post({ json: { issueId: 'cleanup_redundant' } });
            const data = await res.json() as any;
            if (data.success) {
              toast.success(data.message);
              onSuccess?.();
            }
          } finally { setIsCleaningRedundant(false); }
        }
      }
    });
  };

  const handleDeepCleanStorage = async () => {
    update({
      alertDialog: {
        title: '强制物理清理 R2？',
        message: '这将删除所有在数据库中无记录的物理文件（孤儿文件）。',
        type: 'danger',
        confirmLabel: '彻底清理',
        onConfirm: async () => {
          setIsDeepCleaningStorage(true);
          try {
            const res = await api.storage.clean.$post();
            const data = await res.json() as any;
            if (data.success) {
              toast.success(`清理完成，共移除 ${data.count} 个文件`);
            }
          } finally { setIsDeepCleaningStorage(false); }
        }
      }
    });
  };

  return {
    handleAudit, isAuditing,
    handleImportOrphans,
    handleBulkFixUrls,
    handleDeduplicate, isDeduplicating,
    handleBackfillPhotoMetadata, isBackfilling,
    handleNormalizeItemCodes, isNormalizingCodes,
    handleCleanupTempUrls, isCleaningTemp,
    handleCleanupRedundant, isCleaningRedundant,
    handleDeepCleanStorage, isDeepCleaningStorage
  };
}
