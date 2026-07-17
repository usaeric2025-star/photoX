import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { MaintenanceTool } from './MaintenanceTool.js';
import { useTranslation } from '#src/hooks/core/index.js';

interface MaintenanceCenterProps {
  onSuccess: () => void;
}

/**
 * MaintenanceCenter
 * 
 * 系統維護指令中心，提供各類數據修復與清理工具。
 */
export function MaintenanceCenter({ onSuccess }: MaintenanceCenterProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 lg:p-8 space-y-8">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
        {t('maintCenter')} / SYSTEM MAINTENANCE CENTER
      </h3>
      
      {/* 第一组：必要定期检查 (Routine Checks) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-xs font-black text-slate-700">
          <Icon name="check-circle" size={14} className="text-emerald-500" />
          {t('routineSyncHealth')} (Routine Sync & Health)
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MaintenanceTool 
            issueId="refresh_view"
            title={t('refreshPhotoCache')}
            description={t('refreshPhotoCacheDesc')}
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="repair_integrity"
            title={t('repairDatabase')}
            description={t('repairDatabaseDesc')}
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="deduplicate"
            title={t('cleanDupPhotos')}
            description={t('cleanDupPhotosDesc')}
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="cleanup"
            title={t('cleanSystemLogs')}
            description={t('cleanSystemLogsDesc')}
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="ghost_records"
            title={t('cleanGhostRecords')}
            description={t('cleanGhostRecordsDesc')}
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="orphan_files"
            title={t('scanOrphanPhotos')}
            description={t('scanOrphanPhotosDesc')}
            danger={true}
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  );
}
