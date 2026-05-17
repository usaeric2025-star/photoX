import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, CheckSquare, Eye, Globe, RefreshCcw, ChevronDown, Menu, LogIn } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

import { translations, LanguageCode } from '../../lib/translations';
import { useGalleryStore } from '../../store';
import { toast } from 'sonner';

import { Photo, AppSettings } from '../../types';
import { RefreshMenu } from './AdminHeader/RefreshMenu';
import { ToolsMenu } from './AdminHeader/ToolsMenu';

interface Props {
  isMultiSelect: boolean;
  selectedIds: string[];
  filteredPhotos: Photo[];
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
  isAnalyzing: boolean;
  batchProgress: { current: number; total: number };
  settings?: AppSettings | null;
}

export const AdminHeader: React.FC<Props> = ({ 
  isMultiSelect, selectedIds, 
  filteredPhotos, setSelectedIds, setIsMultiSelect, 
  handleBatchAiIdentifyTrigger, handleManageClick, loginWithGoogle,
  onAddPhoto, onRefresh, photosCount, totalPhotosCount, cloudCount,
  appLang = 'zh',
  isAnalyzing, batchProgress, settings: propSettings
}) => {
  const { 
    settings: storeSettings, user, viewMode, setViewMode, isSyncing, 
    activeScreen, setActiveScreen,
    isInfiniteMode, setIsInfiniteMode 
  } = useGalleryStore();
  
  const settings = propSettings || storeSettings;
  
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
      toast.success('无限加载模式已开启 / Infinite mode ON');
    } else {
      toast.success('懒加载模式已恢复 / Lazy loading ON');
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch(e) {
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
      toast.error(`Log in failed: ${errMsg}`);
    }
  };

  const toggleRefreshMenu = () => setShowRefreshMenu(prev => !prev);
  const toggleToolsMenu = () => setShowToolsMenu(prev => !prev);
  
  const handleToggleMultiSelect = () => {
    if (isMultiSelect) {
      setIsMultiSelect(false);
      setSelectedIds([]);
    } else {
      setIsMultiSelect(true);
    }
  };

  const handleToggleViewMode = () => {
    setViewMode(viewMode === 'public' ? 'private' : 'public');
  };

  const handleOpenSettings = () => {
    setActiveScreen?.('manage');
    setShowToolsMenu(false);
  };

  const handleExitStaffMode = () => {
    sessionStorage.removeItem('isStaffMode');
    window.location.reload();
  };

  return (
    <header className="shrink-0 z-[110] bg-brand-bg px-4 sm:px-6 py-2.5 flex items-center justify-between gap-1 sm:gap-4 border-b border-brand-navy/5">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-8 sm:h-10 max-w-[100px] sm:max-w-[160px] object-contain rounded border border-brand-navy/10 p-0.5 bg-white shadow-sm shrink-0" loading="lazy" />
          ) : (
            <h1 className="text-sm sm:text-lg font-black tracking-tighter text-brand-navy border border-brand-navy/10 px-2 sm:px-3 py-1 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">Admin</h1>
          )}
          
          {photosCount !== undefined && (
            <div className="flex items-center gap-1.5 bg-brand-navy/5 px-2 py-1 rounded-full border border-brand-navy/10 shrink-0 overflow-hidden">
              {isSyncing ? (
                <div className="flex items-center gap-1.5 px-1 justify-center shrink-0">
                  <RefreshCcw size={10} className="text-brand-navy/60 animate-spin shrink-0" />
                  <span className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-widest whitespace-nowrap">
                    {photosCount !== undefined && cloudCount ? `${photosCount}/${cloudCount}` : t.loading}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <span className="text-xs font-medium text-brand-navy/60">
                    {photosCount}
                  </span>
                  <span className="text-xs font-medium text-brand-navy/20">/</span>
                  <span className="text-xs font-medium text-blue-600/60 transition-all">
                    {cloudCount === undefined || cloudCount === null ? (
                      <div className="inline-block w-4 h-2 bg-blue-600/10 rounded animate-pulse" />
                    ) : (
                      cloudCount
                    )}
                  </span>
                </div>
              )}
              {isInfiniteMode && (
                <div className="flex items-center gap-1 pl-1 border-l border-brand-navy/10 ml-0.5">
                  <Skeleton className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="text-xs font-semibold text-green-600">INF</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {(!user && sessionStorage.getItem('isStaffMode') !== 'true') ? (
            <button 
              onClick={handleLogin}
              className="px-4 py-2 rounded-2xl text-xs font-medium uppercase tracking-wide bg-brand-navy text-brand-bg shadow-sm active:scale-95 transition-all flex items-center gap-2"
            >
              <LogIn size={14} />
              {t.login}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2 bg-brand-navy/5 py-1 px-3 rounded-2xl border border-brand-navy/10 mr-1">
                {user && user.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-5 h-5 rounded-full" alt="Avatar" loading="lazy" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-brand-navy text-brand-bg flex items-center justify-center text-xs font-medium">
                    {!user ? 'S' : (user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-normal text-brand-navy truncate max-w-[60px]">
                  {!user ? 'Staff' : (user?.displayName || user?.email?.split('@')[0])}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 bg-brand-navy/5 p-1 rounded-2xl border border-brand-navy/10 shadow-inner">
                {/* Refresh with Dropdown */}
                <div className="relative flex items-center" ref={dropdownRef}>
                  <button 
                    onClick={onRefresh}
                    className="w-10 h-10 rounded-xl bg-white text-brand-navy/40 hover:text-blue-600 flex items-center justify-center transition-all shadow-sm border border-brand-navy/10 active:scale-95 group"
                    title={t.refresh}
                  >
                    <RefreshCcw size={18} className="group-active:animate-spin" />
                  </button>
                  <button 
                    onClick={toggleRefreshMenu}
                    className={`absolute -right-1 bottom-0 w-4 h-4 rounded-full bg-brand-navy text-white flex items-center justify-center border-2 border-brand-bg transition-transform ${showRefreshMenu ? 'rotate-180' : ''}`}
                  >
                    <ChevronDown size={10} />
                  </button>
                  
                  <RefreshMenu show={showRefreshMenu} isInfiniteMode={isInfiniteMode} t={t} toggleInfinite={toggleInfinite} />
                </div>
                
                <button 
                  onClick={handleBatchAiIdentifyTrigger}
                  disabled={isAnalyzing}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isAnalyzing ? 'bg-purple-600 text-white shadow-lg scale-105' : 'text-purple-600/50 hover:text-purple-600 bg-white border border-purple-600/10 shadow-sm'}`}
                  title={t.batchAi}
                >
                  {isAnalyzing ? (
                    batchProgress.current > 0 ? (
                      <span className="text-[9px] font-bold text-white">{batchProgress.current}</span>
                    ) : (
                      <Sparkles size={14} className="animate-spin" />
                    )
                  ) : (
                    <Sparkles size={18} />
                  )}
                </button>
                
                {viewMode !== 'public' && (
                  <button 
                    onClick={handleToggleMultiSelect}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isMultiSelect ? 'bg-blue-600 text-white shadow-lg scale-105 ring-4 ring-blue-500/30' : 'text-brand-navy/40 hover:text-brand-navy bg-white border border-brand-navy/10 shadow-sm'}`}
                    title={isMultiSelect ? t.cancelSelect : t.selectMode}
                  >
                    <CheckSquare size={18} />
                  </button>
                )}

                <button 
                  onClick={handleToggleViewMode}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'public' ? 'bg-green-600 text-white shadow-lg scale-105 ring-4 ring-green-500/30' : 'text-brand-navy/40 hover:text-brand-navy bg-white border border-brand-navy/10 shadow-sm'}`}
                  title={viewMode === 'public' ? t.exitGuestView : "访客视图预览"}
                >
                  {viewMode === 'public' ? <Eye size={18} /> : <Globe size={18} />}
                </button>

                {/* More Menu Dropdown */}
                <div className="relative" ref={toolsRef}>
                  <button 
                    onClick={toggleToolsMenu}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${activeScreen === 'manage' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 bg-white border border-slate-200 shadow-sm'}`}
                  >
                    <Menu size={18} />
                  </button>
                  <ToolsMenu 
                    show={showToolsMenu} 
                    t={t} 
                    handleOpenSettings={handleOpenSettings}
                    isStaff={sessionStorage.getItem('isStaffMode') === 'true'}
                    handleExitStaffMode={handleExitStaffMode}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
    </header>
  );
};
