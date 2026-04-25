import React from 'react';
import { Sparkles, CheckSquare, Settings2, Globe, LogIn, Plus } from 'lucide-react';

interface Props {
  settings: any;
  user: any;
  viewMode: 'public' | 'private';
  setViewMode: (v: 'public' | 'private') => void;
  isBatchAnalyzing: boolean;
  batchProgress: { current: number, total: number };
  activeScreen: string;
  isMultiSelect: boolean;
  selectedIds: string[];
  filteredPhotos: any[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setIsMultiSelect: React.Dispatch<React.SetStateAction<boolean>>;
  handleBatchAiIdentifyTrigger: () => void;
  handleManageClick: () => void;
  loginWithGoogle: () => void;
  onAddPhoto?: () => void;
}

export const AdminHeader: React.FC<Props> = ({ 
  settings, user, viewMode, setViewMode, isBatchAnalyzing, 
  batchProgress, activeScreen, isMultiSelect, selectedIds, 
  filteredPhotos, setSelectedIds, setIsMultiSelect, 
  handleBatchAiIdentifyTrigger, handleManageClick, loginWithGoogle,
  onAddPhoto
}) => (
  <header className="shrink-0 z-50 bg-[#FDFAF6] px-6 py-4 flex items-center justify-between gap-4 sticky top-0 pt-safe">
    <div className="flex-1 min-w-0">
      {settings?.logo_url ? (
        <img src={settings.logo_url} alt="Logo" className="h-10 max-w-[180px] object-contain rounded-xl border border-[#1D3557]/10 p-1 bg-white shadow-sm" />
      ) : (
        <h1 className="text-xl font-black tracking-tighter text-[#1D3557] border border-[#1D3557]/10 px-3 py-1 rounded-xl bg-white shadow-sm inline-block italic leading-none">管理界面</h1>
      )}
    </div>

    <div className="flex items-center gap-2">
      {(!user && sessionStorage.getItem('isStaffMode') !== 'true') ? (
        <button 
          onClick={async () => {
            try {
              await loginWithGoogle();
            } catch(e: any) {
              alert('登入失敗: ' + (e.message || JSON.stringify(e)));
            }
          }}
          className="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#1D3557] text-[#FDFAF6] shadow-sm active:scale-95 transition-all flex items-center gap-2"
        >
          <LogIn size={14} />
          登录
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 bg-[#1D3557]/5 py-1 px-3 rounded-2xl border border-[#1D3557]/10">
             {user && user.avatarUrl ? (
               <img src={user.avatarUrl} className="w-6 h-6 rounded-full" alt="Avatar" />
             ) : (
               <div className="w-6 h-6 rounded-full bg-[#1D3557] text-[#FDFAF6] flex items-center justify-center text-[10px] font-bold">
                 {!user ? 'S' : (user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
               </div>
             )}
             <span className="text-[10px] font-black text-[#1D3557] truncate max-w-[80px]">
               {!user ? 'Staff(Local)' : (user?.displayName || user?.email?.split('@')[0])}
             </span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#1D3557]/5 p-1 rounded-2xl border border-[#1D3557]/10">
            <button 
            onClick={() => setViewMode(viewMode === 'public' ? 'private' : 'public')}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${viewMode === 'public' ? 'bg-[#D4A853] text-white shadow-md' : 'text-[#1D3557]/40 hover:text-[#1D3557]'}`}
            title="切換公開頁面"
          >
            <Globe size={18} />
          </button>

          {onAddPhoto && (
            <button 
              onClick={onAddPhoto}
              className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center transition-all shadow-md hover:bg-blue-700 active:scale-95"
              title="新增照片"
            >
              <Plus size={18} />
            </button>
          )}

          {viewMode === 'private' && (
            <>
              <button 
                onClick={handleBatchAiIdentifyTrigger}
                disabled={isBatchAnalyzing}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isBatchAnalyzing ? 'bg-[#1D3557] text-white' : 'text-purple-600/50 hover:text-purple-600'}`}
                title="AI 批量辨識"
              >
                {isBatchAnalyzing ? (
                  <span className="animate-pulse text-[9px] font-bold">{batchProgress.current}</span>
                ) : (
                  <Sparkles size={18} />
                )}
              </button>
              
              <button 
                onClick={() => {
                  if (isMultiSelect) {
                    setIsMultiSelect(false);
                    setSelectedIds([]);
                  } else {
                    setIsMultiSelect(true);
                  }
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isMultiSelect ? 'bg-[#1D3557] text-white shadow-md' : 'text-[#1D3557]/40 hover:text-[#1D3557]'}`}
                title={isMultiSelect ? "取消選擇" : "進入選擇模式"}
              >
                <CheckSquare size={18} />
              </button>

              <button 
                onClick={handleManageClick}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeScreen === 'manage' ? 'bg-[#1D3557] text-white shadow-md' : 'text-[#1D3557]/40 hover:text-[#1D3557]'}`}
                title="設定與管理"
              >
                <Settings2 size={18} />
              </button>
            </>
          )}
          </div>
        </div>
      )}
    </div>
  </header>
);
