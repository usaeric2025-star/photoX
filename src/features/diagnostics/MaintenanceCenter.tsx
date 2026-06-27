import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { MaintenanceTool } from './MaintenanceTool';

interface MaintenanceCenterProps {
  onSuccess: () => void;
}

export function MaintenanceCenter({ onSuccess }: MaintenanceCenterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 lg:p-8 space-y-8">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">系统维护指令中心 / SYSTEM MAINTENANCE CENTER</h3>
      
      {/* 第一组：必要定期检查 (Routine Checks) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-xs font-black text-slate-700">
          <Icon name="check-circle-2" size={14} className="text-emerald-500" />
          常规健康与数据同步 (Routine Sync & Health)
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MaintenanceTool 
            issueId="refresh_view"
            title="刷新照片列表快取" 
            description="手動刷新全局照片快取 (Materialized View)。如果遇到公開頁面數據不更新或顯示空白，請執行此操作。"
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="schema_sync"
            title="同步資料庫架構" 
            description="檢查並補全資料庫中缺失的欄位或架構同步。如果遇到查詢報錯，請優先執行此操作。"
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="orphan_files"
            title="啟動雲端孤兒照片掃描" 
            description="掃描 R2 雲端儲存，如果發現有照片但在資料庫中丟失了記錄，會嘗試修復。 (開發中)"
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="deduplicate"
            title="清理重複的照片記錄" 
            description="自動識別基於檔案雜湊 (Hash) 的重複照片記錄，並僅保留最舊的一份。"
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="cleanup"
            title="全域系統日誌清理" 
            description="清除 30 天以前的系統日誌與 90 天之前的審計日誌，節省資料庫空間。"
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="ghost_records"
            title="清理資料庫殘餘記錄" 
            description="清理資料庫中存在，但在儲存庫中已經遺失的無效照片記錄。"
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  );
}
