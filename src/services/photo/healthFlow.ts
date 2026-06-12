import { logger } from '@/lib/logger';
import { api } from '@/lib/api';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import {
  repairGroupIntegrity,
} from "@/services/photo/maintenance";
import { backfillThumbHashes } from "@/services/photo/maintenance/backfill";
import { getPhotosWithoutThumbHash } from "@/services/photo";
import { showToast } from '@/lib/ui/toast';

export const runHealthCheck = async (
  allPhotos: any[], 
  onAuditFound: (orphans: number) => Promise<void>,
  invalidatePhotos: () => void
) => {

  showToast.success("系统自检中...");

// 1. Data consistency (IDs)
// const broken = await scanAndRepairPhotoIds(allPhotos);
// if (broken.length > 0) {
//   logger.warn(`[HealthCheck] Found ${broken.length} broken IDs`);
// }

  // 2. Group Integrity
  const groupRepair = await repairGroupIntegrity();
  const repairCount = groupRepair.dissolved + groupRepair.synced + groupRepair.deleted;

  // 3. Storage Audit
  const auditResp = await api.storage.audit.$get();
  if (auditResp.ok) {
    const auditData = await auditResp.json();
    if (auditData.success && auditData.data?.orphans > 0) {
      await onAuditFound(auditData.data.orphans);
    }
  }

  // 4. Missing hashes
  const photos = await getPhotosWithoutThumbHash();
  if (photos.length === 0) {
    if (repairCount > 0) {
      showToast.success(`自检完成：修复 ${repairCount} 项`, { id: 'health-check' });
    } else {
      showToast.success("系统状态正常", { id: 'health-check' });
    }
    return;
  }

  let backfilledCount = 0;
  await backfillThumbHashes((stats) => {
    backfilledCount = stats.success;
  });

  if (backfilledCount > 0 || repairCount > 0) {
    invalidatePhotos();
    const msgs = [];
    if (repairCount > 0) msgs.push(`修复合组 ${repairCount}`);
    if (backfilledCount > 0) msgs.push(`回填占位图 ${backfilledCount}`);
    showToast.success(`自检完成：${msgs.join(', ')}`, { id: 'health-check' });
  } else {
    showToast.success("系统状态正常", { id: 'health-check' });
  }
};
