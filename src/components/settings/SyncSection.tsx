import React from 'react';
import { 
  Cloud, LogOut, CloudUpload, CloudDownload, Database 
} from 'lucide-react';
import { User, ApiResponse, DialogData } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFeedback } from '@/hooks';

interface SyncSectionProps {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  performPushSync: () => Promise<ApiResponse>;
  performPullSync: () => Promise<ApiResponse>;
  refreshCloudData: (user: User | null, force?: boolean) => Promise<void>;
  cloudCount: number | null;
  isSyncing: boolean;
  setAlertDialog: (d: DialogData | null) => void;
}

export const SyncSection: React.FC<SyncSectionProps> = ({
  user,
  loginWithGoogle,
  logout,
  performPushSync,
  performPullSync,
  refreshCloudData,
  cloudCount,
  isSyncing,
  setAlertDialog
}) => {
  const { showSuccess } = useFeedback();
  
  return (
    <div className="bg-brand-navy rounded-[32px] p-6 shadow-xl border border-white/5 space-y-4 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 blur-3xl -mr-10 -mt-10 group-hover:bg-brand-gold/20 transition-all duration-700"></div>
      
      <div className="flex items-center justify-between">
        <h4 className="font-black text-white text-[10px] uppercase tracking-widest flex items-center gap-2">
          <Cloud size={18} className={user ? 'text-brand-gold' : 'text-white/30'} />
          云端存储管理 / Cloud Storage
        </h4>
        {user && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-gold/20 rounded-full border border-brand-gold/30">
            <Skeleton className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
            <span className="text-[10px] font-black text-brand-gold uppercase tracking-wider">已连接 / Connected</span>
          </div>
        )}
      </div>

      {!user ? (
        <button 
          onClick={loginWithGoogle}
          className="w-full py-4 bg-white hover:bg-brand-bg text-brand-navy rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          使用 Google 登录 / Login with Google
        </button>
      ) : (
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
            {user?.avatar_url ? (
              <img src={user.avatar_url} className="w-10 h-10 rounded-full border border-white/20" alt="Avatar" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-black border border-brand-gold/20">
                {String(user?.display_name || 'U').charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-black truncate uppercase tracking-tight">{user?.display_name}</p>
              <p className="text-[9px] text-white/40 truncate font-bold tracking-tighter">{user?.email}</p>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-white/30 hover:text-brand-gold transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => performPushSync().catch(()=>{})}
              disabled={isSyncing}
              className="bg-brand-gold hover:bg-brand-gold/90 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 transition-all"
            >
              <CloudUpload size={16} /> 备份至云端 / Backup
            </button>
            <button 
              onClick={() => performPullSync().catch(()=>{})}
              disabled={isSyncing}
              className="bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 transition-all"
            >
              <CloudDownload size={16} /> 从云端恢复 / Restore
            </button>
          </div>

          <div className="text-center p-2 bg-black/20 rounded-xl border border-white/5">
            <p className="text-[10px] text-white/40 uppercase tracking-widest leading-loose">
              云端 / Cloud: <span className="text-white font-black">{cloudCount !== null ? cloudCount : '---'} Pcs</span>
            </p>
          </div>

          {/* Advanced: Reset Local Cache */}
          <div className="flex border-t border-white/5 pt-4 justify-between items-center bg-black/20 -mx-6 -mb-6 p-6">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-white/20" />
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Local Cache</span>
            </div>
            <button 
              onClick={async () => {
                setAlertDialog({
                  title: '确认清空 / Reset Cache',
                  message: '确定要清空本地数据缓存并从云端完整拉取吗？ / Reset local cache and re-sync from cloud?',
                  onConfirm: async () => {
                    localStorage.removeItem('uuid_v2_cleanup_done');
                    await refreshCloudData(user, true);
                    showSuccess('本地缓存已重置 / Cache reset');
                  },
                  type: 'danger'
                });
              }}
              className="text-[9px] font-black text-brand-gold hover:text-white uppercase tracking-[0.2em] px-4 py-2 border border-brand-gold/30 rounded-full bg-brand-gold/5 transition-all active:scale-95"
            >
              Reset & Full Sync
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
