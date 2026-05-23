import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, CheckSquare, Eye, Globe, RefreshCcw, ChevronDown, Menu, LogIn, Wrench } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

import { translations, LanguageCode } from '../../lib/translations';
import { useGalleryStore, useShallow } from '../../store';
import { useFeedback, useMultiSelect, useTasks } from '../../hooks';

import { Photo, AppSettings } from '../../types';
import { RefreshMenu } from './AdminHeader/RefreshMenu';
import { ToolsMenu } from './AdminHeader/ToolsMenu';

import { LanguageSwitcher } from '../ui/LanguageSwitcher';

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
  settings?: AppSettings | null;
}

export const AdminHeader: React.FC<Props> = ({ 
  filteredPhotos, 
  handleBatchAiIdentifyTrigger, handleManageClick, loginWithGoogle,
  onAddPhoto, onRefresh, photosCount, totalPhotosCount, cloudCount,
  appLang = 'en',
  isAnalyzing, settings: propSettings
}) => {
  const { tasks } = useTasks();
  const { 
    settings: storeSettings, user, viewMode, setViewMode, isSyncing, 
    activeScreen, setActiveScreen,
    isInfiniteMode, setIsInfiniteMode,
    adminPreviewMode, setAdminPreviewMode,
    isStaffMode
  } = useGalleryStore(useShallow(s => ({
    settings: s.settings,
    user: s.user,
    viewMode: s.viewMode,
    setViewMode: s.setViewMode,
    isSyncing: (s.loadingType as string) === 'sync-pull' || (s.loadingType as string) === 'sync-push',
    activeScreen: s.activeScreen,
    setActiveScreen: s.setActiveScreen,
    isInfiniteMode: s.isInfiniteMode,
    setIsInfiniteMode: s.setIsInfiniteMode,
    adminPreviewMode: s.adminPreviewMode,
    setAdminPreviewMode: s.setAdminPreviewMode,
    isStaffMode: s.isStaffMode
  })));
  
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
    setAdminPreviewMode(adminPreviewMode === 'private' ? 'public' : 'private');
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
    useGalleryStore.getState().setIsStaffMode(false);
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brand-navy/10 bg-brand-navy/5 shadow-inner">
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

          {isStaffMode && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 border border-amber-500/10 rounded-full text-[11px] font-bold shadow-sm animate-pulse shrink-0">
               <Wrench size={12} />
               <span>
                 {appLang === 'zh' ? '员工模式' : appLang === 'ms' ? 'Mod Staf' : 'Staff Mode'}
               </span>
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

                 {adminPreviewMode === 'private' && (
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

                {isStaffMode && (
                  <button 
                    onClick={handleExitStaffMode}
                    className="h-9 sm:h-10 px-3 flex items-center gap-1.5 rounded-xl text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 bg-red-50/50 shadow-sm transition-all active:scale-95"
                    title={t.exitStaffMode}
                  >
                    <LogIn size={16} className="rotate-180" />
                    <span className="hidden md:inline text-[10px] font-black tracking-widest uppercase whitespace-nowrap">{t.exitStaffMode}</span>
                  </button>
                )}

                <LanguageSwitcher variant="admin" />

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
                    isStaff={isStaffMode}
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
