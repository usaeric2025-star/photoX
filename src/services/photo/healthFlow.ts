import { api } from '@/lib/api';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import {
  scanAndRepairPhotoIds,
  repairGroupIntegrity,
} from "@/services/photo/photoMaintenanceService";
import { backfillThumbHashes } from "@/services/photo/backfillService";
import { getPhotosWithoutThumbHash } from "@/services/photo/queries";
import { toast } from 'sonner';

export const runHealthCheck = async (
  allPhotos: any[], 
  onAuditFound: (orphans: number) => Promise<void>,
  invalidatePhotos: () => void
) => {
  toast.success("正在啟動系統級一致性巡檢...");

  // 1. Data consistency (IDs)
  const broken = await scanAndRepairPhotoIds(allPhotos);
  if (broken.length > 0) {
    console.warn(`[HealthCheck] Found ${broken.length} broken IDs`);
  }

  // 2. Group Integrity
  const groupRepair = await repairGroupIntegrity();
  if (groupRepair.dissolved > 0 || groupRepair.synced > 0 || groupRepair.deleted > 0) {
    toast.success(`合組一致性修復：解散孤立組 ${groupRepair.dissolved} 個，同步計數 ${groupRepair.synced} 個，清理空組 ${groupRepair.deleted} 個`);
  }

  // 3. Storage Audit
  const auditResp = await api.storage.audit.$get();
  if (!auditResp.ok) {
    throw ErrorFactory.wrap(new Error(`存储审计失败 (HTTP ${auditResp.status})`), 'checkStorageHealth');
  }
  const auditData = await auditResp.json();
  if (auditData.success && auditData.data) {
    const { orphans } = auditData.data;
    if (orphans > 0) {
      await onAuditFound(orphans);
    }
  }

  // 4. Missing hashes
  const missingHashes = await getPhotosWithoutThumbHash();
  if (!missingHashes || missingHashes.length === 0) {
    toast.success("系統診斷完成：所有照片健康度良好");
    return;
  }

  let backfilledCount = 0;
  await backfillThumbHashes((stats) => {
    backfilledCount = stats.success;
  });

  if (backfilledCount > 0) {
    invalidatePhotos();
    toast.success(`診斷修復完成，成功回填 ${backfilledCount} 張照片的佔位圖！`);
  } else {
    toast.success("診斷完成：未發現需要修復的项目");
  }
};
