import { logger } from '@/lib/logger';
import { api } from '@/lib/api';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import {
  repairGroupIntegrity,
} from "@/services/photo/maintenance";
import { showToast } from '@/lib/ui/toast';

import { Photo } from '@/types';

export const runHealthCheck = async (
  allPhotos: Photo[], 
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

  // 4. Missing hashes check removed (thumbhash removed from project)
  
  if (repairCount > 0) {
    invalidatePhotos();
    showToast.success(`自检完成：修复合组 ${repairCount}`, { id: 'health-check' });
  } else {
    showToast.success("系统状态正常", { id: 'health-check' });
  }
};
