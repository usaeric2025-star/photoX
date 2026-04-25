import React from 'react';
import { Sparkles, CheckSquare, Settings2, Eye, EyeOff, LogIn, Plus } from 'lucide-react';

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
  photosCount?: number;
  totalPhotosCount?: number;
  cloudCount?: number | null;
}

export const AdminHeader: React.FC<Props> = ({ 
  settings, user, viewMode, setViewMode, isBatchAnalyzing, 
  batchProgress, activeScreen, isMultiSelect, selectedIds, 
  filteredPhotos, setSelectedIds, setIsMultiSelect, 
  handleBatchAiIdentifyTrigger, handleManageClick, loginWithGoogle,
  onAddPhoto, photosCount, totalPhotosCount, cloudCount
}) => (
  <header className="shrink-0 z-50 bg-[#FDFAF6] px-6 py-4 flex items-center justify-between gap-4 border-b border-[#1D3557]/5">
    <div className="flex-1 min-w-0">
      {settings?.logo_url ? (
        <div className="flex items-center gap-3">
          <img src={settings.logo_url} alt="Logo" className="h-10 max-w-[180px] object-contain rounded-xl border border-[#1D3557]/10 p-1 bg-white shadow-sm" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[#1D3557] uppercase tracking-widest leading-none mb-1">Admin Panel</span>
            {photosCount !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 italic">
                  {photosCount} / {totalPhotosCount || 0}
                </span>
                {cloudCount !== undefined && cloudCount !== null && (
                  <span className="text-[10px] font-bold text-[#1D3557]/30 uppercase tracking-tighter">
                    Cloud: {cloudCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-tighter text-[#1D3557] border border-[#1D3557]/10 px-3 py-1 rounded-xl bg-white shadow-sm inline-block italic leading-none shrink-0">管理界面</h1>
          {photosCount !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100 italic shadow-sm">
                {photosCount} / {totalPhotosCount || 0}
              </span>
              {cloudCount !== undefined && cloudCount !== null && (
                <span className="text-[10px] font-bold text-[#1D3557]/30 uppercase tracking-widest bg-[#1D3557]/5 px-2 py-1 rounded-lg">
                  Cloud: {cloudCount}
                </span>
              )}
            </div>
          )}
        </div>
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
            title="预览展示页"
          >
            {viewMode === 'public' ? <Eye size={18} /> : <EyeOff size={18} />}
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
          
          <button 
            onClick={handleBatchAiIdentifyTrigger}
            disabled={isBatchAnalyzing}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isBatchAnalyzing ? 'bg-[#1D3557] text-white shadow-lg scale-105' : 'text-purple-600/50 hover:text-purple-600 ring-1 ring-purple-600/10'}`}
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
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isMultiSelect ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-[#1D3557]/40 hover:text-[#1D3557] ring-1 ring-[#1D3557]/10'}`}
            title={isMultiSelect ? "取消选择" : "进入选择模式"}
          >
            <CheckSquare size={18} />
          </button>

          <button 
            onClick={handleManageClick}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeScreen === 'manage' ? 'bg-[#1D3557] text-white shadow-lg' : 'text-[#1D3557]/40 hover:text-[#1D3557]'}`}
            title="設定與管理"
          >
            <Settings2 size={18} />
          </button>
          </div>
        </div>
      )}
    </div>
  </header>
);
