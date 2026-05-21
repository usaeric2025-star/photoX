import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, CheckSquare, Eye, Globe, RefreshCcw, ChevronDown, Menu, LogIn, Wrench } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

import { translations, LanguageCode } from '../../lib/translations';
import { useGalleryStore } from '../../store';
import { useFeedback, useMultiSelect } from '../../hooks';

import { Photo, AppSettings } from '../../types';
import { RefreshMenu } from './AdminHeader/RefreshMenu';
import { ToolsMenu } from './AdminHeader/ToolsMenu';

interface Props {
  filteredPhotos: Photo[];
  handleBatchAiIdentifyTrigger: () => void;
  handleManageClick: () => void;
  loginWithGoogle: () => void;
  onAddPhoto?: () => void;
  onRefresh?: () => void;
  photosCount?: number;
  totalPhotosCount?: number;
  cloudCount?: number | null;
  appLang?: string;
  isAnalyzing: boolean;
  batchProgress: { current: number; total: number };
  settings?: AppSettings | null;
}

export const AdminHeader: React.FC<Props> = ({ 
  filteredPhotos, 
  handleBatchAiIdentifyTrigger, handleManageClick, loginWithGoogle,
  onAddPhoto, onRefresh, photosCount, totalPhotosCount, cloudCount,
  appLang = 'en',
  isAnalyzing, batchProgress, settings: propSettings
}) => {
  const { 
    settings: storeSettings, user, viewMode, setViewMode, isSyncing, 
    activeScreen, setActiveScreen,
    isInfiniteMode, setIsInfiniteMode,
    adminPreviewMode, setAdminPreviewMode
  } = useGalleryStore();
  
  const { isMultiSelect, disable, enable } = useMultiSelect();
  const { showError, showSuccess } = useFeedback();

  const handleToggleMultiSelect = () => {
    if (isMultiSelect) {
      disable();
    } else {
      enable();
    }
  };
  
  const settings = propSettings || storeSettings;
  
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  
  const t = translations[appLang as LanguageCode] || translations['en'];

  useEffect(() => {
    let active = true;
    const handleClickOutside = (event: MouseEvent) => {
      if (!active) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRefreshMenu(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { 
      active = false;
      document.removeEventListener('mousedown', handleClickOutside); 
    };
  }, []);

  const toggleInfinite = () => {
    const nextValue = !isInfiniteMode;
    setIsInfiniteMode(nextValue);
    setShowRefreshMenu(false);
    if (nextValue) {
      showSuccess('无限加载模式已开启 / Infinite mode ON');
    } else {
      showSuccess('懒加载模式已恢复 / Lazy loading ON');
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch(e) {
      showError(e, '登录失败');
    }
  };

  const toggleRefreshMenu = () => setShowRefreshMenu(prev => !prev);
  const toggleToolsMenu = () => setShowToolsMenu(prev => !prev);
  
  const handleToggleViewMode = () => {
    const nextMode = adminPreviewMode === 'public' ? 'private' : 'public';
    setAdminPreviewMode(nextMode);
    // When entering public preview, ensure we are on the gallery screen
    if (nextMode === 'public') {
      setActiveScreen('home');
    }
  };

  const handleOpenSettings = () => {
    if (handleManageClick) {
      handleManageClick();
    } else {
      setActiveScreen?.('manage');
    }
    setShowToolsMenu(false);
  };

  const handleExitStaffMode = () => {
    sessionStorage.removeItem('isStaffMode');
    window.location.reload();
  };

  const currentLang = appLang || 'en';

  return (
    <header className="shrink-0 z-[110] bg-brand-bg px-4 sm:px-6 py-2.5 flex items-center justify-between gap-1 sm:gap-4 border-b border-brand-navy/5">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="lg:hidden h-10 sm:h-14 max-w-[150px] sm:max-w-[220px] object-contain rounded-xl border border-brand-navy/10 p-1 bg-white shadow-sm shrink-0" loading="lazy" />
          ) : (
            <h1 className="lg:hidden text-sm sm:text-lg font-black tracking-tighter text-brand-navy border border-brand-navy/10 px-2 sm:px-3 py-1 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">Admin</h1>
          )}
          
          {photosCount !== undefined && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-navy/5 rounded-full border border-brand-navy/10 shadow-inner">
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="font-bold text-brand-navy/80">{photosCount}</span>
                <span className="text-brand-navy/30">/</span>
                <span className="font-bold text-blue-600">
                  {cloudCount === undefined || cloudCount === null ? (
                    <div className="inline-block w-3 h-2 bg-blue-600/10 rounded animate-pulse" />
                  ) : (
                    cloudCount
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Header language switcher removed as it is now in the Tools Menu */}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1.5 bg-brand-navy/5 p-1 rounded-2xl border border-brand-navy/10 shadow-inner">
                {/* Refresh with Dropdown */}
                <div className="relative flex items-center" ref={dropdownRef}>
                  <button 
                    onClick={onRefresh}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white text-brand-navy/60 hover:text-blue-600 flex items-center justify-center transition-all shadow-sm border border-brand-navy/10 active:scale-95 group"
                    title={t.refresh}
                  >
                    <RefreshCcw size={18} className={isSyncing ? "animate-spin" : "group-active:animate-spin"} />
                  </button>
                  <button 
                    onClick={toggleRefreshMenu}
                    className={`absolute -right-1.5 bottom-0 w-4 h-4 rounded-full bg-brand-navy text-white flex items-center justify-center border-2 border-brand-bg transition-transform ${showRefreshMenu ? 'rotate-180' : ''}`}
                  >
                    <ChevronDown size={10} />
                  </button>
                  
                  <RefreshMenu show={showRefreshMenu} isInfiniteMode={isInfiniteMode} t={t} toggleInfinite={toggleInfinite} />
                </div>
                
                <button 
                  onClick={handleBatchAiIdentifyTrigger}
                  disabled={isAnalyzing}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${isAnalyzing ? 'bg-purple-600 text-white shadow-lg scale-105' : 'text-purple-600/50 hover:text-purple-600 bg-white border border-purple-600/10 shadow-sm'}`}
                  title={t.batchAi}
                >
                  {isAnalyzing ? (
                    batchProgress.current > 0 ? (
                      <span className="text-[10px] font-bold text-white">{batchProgress.current}</span>
                    ) : (
                      <Sparkles size={16} className="animate-spin" />
                    )
                  ) : (
                    <Sparkles size={18} />
                  )}
                </button>

                {adminPreviewMode !== 'public' && (
                  <button 
                    onClick={handleToggleMultiSelect}
                    className={`h-9 sm:h-10 px-2.5 sm:px-3 flex items-center gap-1.5 sm:gap-2 rounded-xl transition-all shadow-sm border ${isMultiSelect ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-500/20' : 'text-brand-navy/60 hover:text-brand-navy bg-white border-brand-navy/10'}`}
                    title={isMultiSelect ? t.cancelSelect : t.selectMode}
                  >
                    <CheckSquare size={18} />
                    <span className="hidden sm:inline text-[10px] font-bold whitespace-nowrap">{isMultiSelect ? t.cancelSelect : t.selectMode}</span>
                  </button>
                )}

                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggleViewMode();
                  }}
                  type="button"
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${adminPreviewMode === 'public' ? 'bg-green-600 text-white shadow-lg ring-4 ring-green-400/30' : 'text-brand-navy/40 hover:text-brand-navy bg-white border border-brand-navy/10 shadow-sm'}`}
                  title={adminPreviewMode === 'public' ? t.exitGuestView : "访客视图预览"}
                >
                  {adminPreviewMode === 'public' ? <Eye size={18} /> : <Globe size={18} />}
                </button>

                {/* More Menu Dropdown */}
                <div className="relative" ref={toolsRef}>
                  <button 
                    onClick={toggleToolsMenu}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all relative ${activeScreen === 'manage' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 bg-white border border-slate-200 shadow-sm'}`}
                  >
                    <Menu size={18} />
                  </button>
                  <ToolsMenu 
                    show={showToolsMenu} 
                    t={t} 
                    handleOpenSettings={handleOpenSettings}
                    isStaff={sessionStorage.getItem('isStaffMode') === 'true'}
                    handleExitStaffMode={handleExitStaffMode}
                    currentLang={currentLang}
                    onSetLang={(l) => useGalleryStore.getState().setLanguage(l as 'zh' | 'en' | 'ms')}
                  />
                </div>
              </div>
            </div>
        </div>
    </header>
  );
};
