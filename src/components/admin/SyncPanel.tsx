import React from 'react';
import { CloudUpload, CloudDownload, RefreshCcw } from 'lucide-react';

interface Props {
  isSyncing: boolean;
  onSync: () => void;
  lastSyncTime: string | null;
}

export const SyncPanel: React.FC<Props> = ({ isSyncing, onSync, lastSyncTime }) => (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">資料同步狀態</h3>
        <button 
          onClick={onSync}
          disabled={isSyncing}
          className="p-3 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20 disabled:opacity-50 transition-transform active:scale-95"
        >
          <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className="text-xs text-slate-500">
        最後同步時間: {lastSyncTime || '從未同步'}
      </p>
    </div>
);
