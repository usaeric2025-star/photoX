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

  toast.success("正在启动系统级健康检查...");

  // 1. Data consistency (IDs)
  const broken = await scanAndRepairPhotoIds(allPhotos);
  if (broken.length > 0) {
    console.warn(`[HealthCheck] Found ${broken.length} broken IDs`);
  }

  // 2. Group Integrity
  const groupRepair = await repairGroupIntegrity();
  if (groupRepair.dissolved > 0 || groupRepair.synced > 0 || groupRepair.deleted > 0) {
    toast.success(`合组一致性修复：解散孤立组 ${groupRepair.dissolved} 个，同步计数 ${groupRepair.synced} 个，清理空组 ${groupRepair.deleted} 个`);
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
    toast.success("系统诊断完成：未发现需要修复的项目");
    return;
  }

  let backfilledCount = 0;
  await backfillThumbHashes((stats) => {
    backfilledCount = stats.success;
  });

  if (backfilledCount > 0) {
    invalidatePhotos();
    toast.success(`诊断修复完成，成功回填 ${backfilledCount} 张照片的占位图！`);
  } else {
    toast.success("诊断完成：未发现需要修复的项目");
  }
};
