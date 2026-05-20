import React, { useState } from 'react';
import { CloudUpload, CloudDownload, RefreshCcw, Sparkles, AlertCircle } from 'lucide-react';
import { backfillThumbHashes, BackfillStats } from '../../services/photo/backfillService';
import { useFeedback } from '../../hooks';

interface Props {
  isSyncing: boolean;
  onSync: () => void;
  lastSyncTime: string | null;
}

export const SyncPanel: React.FC<Props> = ({ isSyncing, onSync, lastSyncTime }) => {
  const { showSuccess, showError } = useFeedback();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [stats, setStats] = useState<BackfillStats | null>(null);

  const handleBackfill = async () => {
    if (!window.confirm('確定要開始回填 ThumbHash 嗎？這將會掃描所有舊照片並生成占位圖，可能需要一些時間。')) return;
    
    setIsBackfilling(true);
    try {
      await backfillThumbHashes((s) => setStats(s));
      showSuccess('ThumbHash 回填完成！');
    } catch (err) {
      showError(err, 'backfill');
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sync Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">資料同步狀態</h3>
          <button 
            onClick={onSync}
            disabled={isSyncing}
            className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20 disabled:opacity-50 transition-transform active:scale-95"
          >
            <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          最後同步時間: {lastSyncTime || '從未同步'}
        </p>
      </div>

      {/* Maintenance Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-800">系統維護</h3>
            <p className="text-[10px] text-slate-400">優化載入體驗與存取性能</p>
          </div>
          <button 
            onClick={handleBackfill}
            disabled={isBackfilling}
            className="p-2.5 bg-brand-navy/10 text-brand-navy rounded-xl disabled:opacity-50 transition-transform active:scale-95"
          >
            <Sparkles size={18} className={isBackfilling ? 'animate-pulse' : ''} />
          </button>
        </div>

        {isBackfilling && stats && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-[11px] font-medium text-slate-600">
              <span>正在生成占位圖...</span>
              <span>{Math.round((stats.processed / stats.total) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-navy transition-all duration-300" 
                style={{ width: `${(stats.processed / stats.total) * 100}%` }}
              />
            </div>
            <div className="flex gap-4 text-[10px] text-slate-400">
              <span>成功: <span className="text-emerald-500 font-bold">{stats.success}</span></span>
              <span>失敗: <span className="text-rose-500 font-bold">{stats.failed}</span></span>
              <span>剩餘: {stats.total - stats.processed}</span>
            </div>
          </div>
        )}

        {!isBackfilling && (
          <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-2xl">
            <AlertCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              點擊上方圖示為存量照片生成 **ThumbHash**。這將提升弱網環境下的首屏視覺流暢度。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
