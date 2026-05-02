import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, CheckSquare, Settings2, Eye, EyeOff, LogIn, Plus, Globe, RefreshCcw, ChevronDown, FileText, CheckCircle2, Menu, LayoutTemplate } from 'lucide-react';
import { translations, LanguageCode } from '../../lib/translations';
import { useAdminSession, useAdminUI } from '../../context/AdminContexts';
import { useGalleryContext } from '../../context/GalleryContext';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isMultiSelect: boolean;
  selectedIds: string[];
  filteredPhotos: any[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setIsMultiSelect: React.Dispatch<React.SetStateAction<boolean>>;
  handleBatchAiIdentifyTrigger: () => void;
  handleManageClick: () => void;
  loginWithGoogle: () => void;
  onAddPhoto?: () => void;
  onRefresh?: () => void;
  photosCount?: number;
  totalPhotosCount?: number;
  cloudCount?: number | null;
  appLang?: string;
}

export const AdminHeader: React.FC<Props> = ({ 
  isMultiSelect, selectedIds, 
  filteredPhotos, setSelectedIds, setIsMultiSelect, 
  handleBatchAiIdentifyTrigger, handleManageClick, loginWithGoogle,
  onAddPhoto, onRefresh, photosCount, totalPhotosCount, cloudCount,
  appLang = 'zh'
}) => {
  const { settings, user, viewMode, setViewMode } = useAdminSession();
  const { isAnalyzing, batchProgress, activeScreen, setActiveScreen, showToast } = useAdminUI();
  const { isInfiniteMode, setIsInfiniteMode } = useGalleryContext();
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  
  const t = translations[appLang as LanguageCode] || translations['zh'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRefreshMenu(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleInfinite = () => {
    const nextValue = !isInfiniteMode;
    setIsInfiniteMode(nextValue);
    setShowRefreshMenu(false);
    if (nextValue) {
      showToast?.('无限加载模式已开启 / Infinite mode ON', 'success');
    } else {
      showToast?.('懒加载模式已恢复 / Lazy loading ON', 'success');
    }
  };

  return (
    <>
      <header className="shrink-0 z-[110] bg-[#FDFAF6] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-1 sm:gap-4 border-b border-[#1D3557]/5">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-10 sm:h-12 max-w-[120px] sm:max-w-[180px] object-contain rounded-lg border border-[#1D3557]/10 p-0.5 bg-white shadow-sm" />
          ) : (
            <h1 className="text-sm sm:text-lg font-black tracking-tighter text-[#1D3557] border border-[#1D3557]/10 px-2 sm:px-3 py-1 rounded-xl bg-white shadow-sm inline-block italic leading-none shrink-0">Admin</h1>
          )}
          
          {photosCount !== undefined && (
            <div className="flex items-center gap-1.5 bg-[#1D3557]/5 px-2 py-1 rounded-full border border-[#1D3557]/10 shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-[#1D3557]/60">
                  {photosCount}
                </span>
                <span className="text-xs font-medium text-[#1D3557]/20">/</span>
                <span className="text-xs font-medium text-blue-600/60">
                  {cloudCount || 0}
                </span>
              </div>
              {isInfiniteMode && (
                <div className="flex items-center gap-1 pl-1 border-l border-[#1D3557]/10 ml-0.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-green-600">INF</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {(!user && sessionStorage.getItem('isStaffMode') !== 'true') ? (
            <button 
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } catch(e: any) {
                  showToast?.(`Log in failed: ${e.message || JSON.stringify(e)}`, 'error');
                }
              }}
              className="px-4 py-2 rounded-2xl text-xs font-medium uppercase tracking-wide bg-[#1D3557] text-[#FDFAF6] shadow-sm active:scale-95 transition-all flex items-center gap-2"
            >
              <LogIn size={14} />
              {t.login}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2 bg-[#1D3557]/5 py-1 px-3 rounded-2xl border border-[#1D3557]/10 mr-1">
                {user && user.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-5 h-5 rounded-full" alt="Avatar" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#1D3557] text-[#FDFAF6] flex items-center justify-center text-xs font-medium">
                    {!user ? 'S' : (user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-normal text-[#1D3557] truncate max-w-[60px]">
                  {!user ? 'Staff' : (user?.displayName || user?.email?.split('@')[0])}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 bg-[#1D3557]/5 p-1 rounded-2xl border border-[#1D3557]/10 shadow-inner">
                {/* Refresh with Dropdown */}
                <div className="relative flex items-center" ref={dropdownRef}>
                  <button 
                    onClick={onRefresh}
                    className="w-10 h-10 rounded-xl bg-white text-[#1D3557]/40 hover:text-blue-600 flex items-center justify-center transition-all shadow-sm border border-[#1D3557]/10 active:scale-95 group"
                    title={t.refresh}
                  >
                    <RefreshCcw size={18} className="group-active:animate-spin" />
                  </button>
                  <button 
                    onClick={() => setShowRefreshMenu(!showRefreshMenu)}
                    className={`absolute -right-1 bottom-0 w-4 h-4 rounded-full bg-[#1D3557] text-white flex items-center justify-center border-2 border-[#FDFAF6] transition-transform ${showRefreshMenu ? 'rotate-180' : ''}`}
                  >
                    <ChevronDown size={10} />
                  </button>
                  
                  <AnimatePresence>
                    {showRefreshMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-[#1D3557]/10 overflow-hidden z-[120]"
                      >
                        <button 
                          onClick={toggleInfinite}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#1D3557]/5 transition-colors text-left"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isInfiniteMode ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {isInfiniteMode ? <CheckCircle2 size={16} /> : <FileText size={16} />}
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-[#1D3557] uppercase tracking-wide">
                              {isInfiniteMode ? '已开启无限加载' : '开启无限加载'}
                            </div>
                            <div className="text-[9px] text-[#1D3557]/40 font-medium leading-none mt-1">
                              {isInfiniteMode ? '一键显示所有照片' : '分批次逐步加载'}
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <button 
                  onClick={handleBatchAiIdentifyTrigger}
                  disabled={isAnalyzing}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isAnalyzing ? 'bg-purple-600 text-white shadow-lg scale-105' : 'text-purple-600/50 hover:text-purple-600 bg-white border border-purple-600/10 shadow-sm'}`}
                  title={t.batchAi}
                >
                  {isAnalyzing ? (
                    <span className="animate-pulse text-[9px] font-bold">{batchProgress.current}</span>
                  ) : (
                    <Sparkles size={18} />
                  )}
                </button>
                
                {viewMode !== 'public' && (
                  <button 
                    onClick={() => {
                      if (isMultiSelect) {
                        setIsMultiSelect(false);
                        setSelectedIds([]);
                      } else {
                        setIsMultiSelect(true);
                      }
                    }}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isMultiSelect ? 'bg-blue-600 text-white shadow-lg scale-105 ring-4 ring-blue-500/30' : 'text-[#1D3557]/40 hover:text-[#1D3557] bg-white border border-[#1D3557]/10 shadow-sm'}`}
                    title={isMultiSelect ? t.cancelSelect : t.selectMode}
                  >
                    <CheckSquare size={18} />
                  </button>
                )}

                <button 
                  onClick={() => {
                    setViewMode(viewMode === 'public' ? 'private' : 'public')
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'public' ? 'bg-green-600 text-white shadow-lg scale-105 ring-4 ring-green-500/30' : 'text-[#1D3557]/40 hover:text-[#1D3557] bg-white border border-[#1D3557]/10 shadow-sm'}`}
                  title={viewMode === 'public' ? "退出访客视图" : "访客视图预览"}
                >
                  {viewMode === 'public' ? <Eye size={18} /> : <Globe size={18} />}
                </button>

                {/* More Menu Dropdown */}
                <div className="relative" ref={toolsRef}>
                  <button 
                    onClick={() => setShowToolsMenu(!showToolsMenu)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${(activeScreen === 'manage' || activeScreen === 'editor') ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 bg-white border border-slate-200 shadow-sm'}`}
                  >
                    <Menu size={18} />
                  </button>
                  <AnimatePresence>
                    {showToolsMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[120]"
                      >
                        <button 
                          onClick={() => { setActiveScreen?.('editor'); setShowToolsMenu(false); }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                        >
                          <LayoutTemplate size={16} /> <span className="text-xs font-bold uppercase">广告海报制作</span>
                        </button>
                        <button 
                          onClick={() => { setActiveScreen?.('manage'); setShowToolsMenu(false); }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                        >
                          <Settings2 size={16} /> <span className="text-xs font-bold uppercase">系统设置</span>
                        </button>
                        <div className="h-px bg-slate-100" />
                        <button 
                          onClick={() => { setActiveScreen?.('home'); setShowToolsMenu(false); }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                        >
                          <Plus size={16} /> <span className="text-xs font-bold uppercase">返回照片管理</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Tab bar */}
      {(user || sessionStorage.getItem('isStaffMode') === 'true') && (
        <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1">
             {[
               { id: 'home', label: '照片管理', icon: <Plus size={12} /> },
               { id: 'editor', label: '海报制作', icon: <LayoutTemplate size={12} /> },
               { id: 'manage', label: '系统设置', icon: <Settings2 size={12} /> }
             ].map((tab) => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveScreen?.(tab.id as any)}
                 className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeScreen === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
               >
                 {tab.icon} {tab.label}
               </button>
             ))}
          </div>
        </div>
      )}
    </>
  );
};
