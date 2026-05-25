import React, { useState, useRef, useEffect } from 'react';
import { RefreshCcw, Globe, Menu, LogIn, Wrench, Sparkles, CheckSquare, Search, ChevronDown } from 'lucide-react';
import { useGalleryStore, useShallow } from '../../store';
import { useFeedback, useMultiSelect, useTasks, useSettings, useAuth } from '../../hooks';
import { translations, LanguageCode } from '../../lib/translations';
import { Photo, AppSettings } from '../../types';
import { GalleryVariant } from '@/types/variant';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { loginWithGoogle } from '@/services/supabaseService';
import { RefreshMenu } from './RefreshMenu';
import { ToolsMenu } from './ToolsMenu';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/constants';

interface UnifiedHeaderProps {
  variant: GalleryVariant;
  photos?: Photo[];
  totalCount?: number;
  cloudCount?: number;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  handleManageClick?: () => void;
  adminPreviewMode?: 'private' | 'public';
  setAdminPreviewMode?: (m: 'private' | 'public') => void;
  handleBatchAiIdentifyTrigger?: () => void;
  onExit?: () => void;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  variant,
  photos = [],
  totalCount,
  cloudCount,
  isRefreshing: propIsRefreshing,
  onRefresh,
  handleManageClick,
  adminPreviewMode,
  setAdminPreviewMode,
  handleBatchAiIdentifyTrigger,
  onExit
}) => {
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  const isPublic = variant === 'public-showcase';
  const { settings: fetchedSettings } = useSettings();
  const { user } = useAuth();
  const { 
    appLang, isStaffMode, activeScreen, setActiveScreen,
    isInfiniteMode, setIsInfiniteMode, setAppLang
  } = useGalleryStore(useShallow(s => ({
    appLang: s.appLang,
    isStaffMode: s.isStaffMode,
    activeScreen: s.activeScreen,
    setActiveScreen: s.setActiveScreen,
    isInfiniteMode: s.isInfiniteMode,
    setIsInfiniteMode: s.setIsInfiniteMode,
    setAppLang: s.setAppLang
  })));

  const { tasks } = useTasks();
  const isSyncing = tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('导入')));
  const isRefreshing = propIsRefreshing || isSyncing;
  
  const { isMultiSelect, disable, enable } = useMultiSelect();
  const { showError, showSuccess } = useFeedback();

  const [showRefreshMenu, setShowRefreshMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  const lang = (appLang || 'zh') as LanguageCode;
  const t = translations[lang] || translations.zh;

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

  const navigate = useNavigate();
  const handleLogin = () => {
    useGalleryStore.getState().setShowPassPrompt(true);
  };

  const handleExitStaffMode = () => {
    useGalleryStore.getState().setIsStaffMode(false);
    sessionStorage.removeItem('isStaffMode');
    localStorage.removeItem('isStaffMode');
    window.location.reload();
  };

  const isEffectiveStaffMode = isStaffMode && !user;

  const headerClass = isManagement 
    ? (adminPreviewMode === 'public' ? "bg-green-50 border-green-200" : isEffectiveStaffMode ? "bg-amber-50 border-amber-200" : "bg-white border-[#ECECEC]")
    : "bg-white border-[#ECECEC]";

  return (
    <header className={`shrink-0 z-[110] h-[58px] px-4 sm:px-6 flex items-center justify-between gap-1 sm:gap-4 border-b ${headerClass}`}>
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {fetchedSettings?.logo_url ? (
          <img src={fetchedSettings.logo_url} alt="Logo" className="h-8 w-auto object-contain rounded-xl border border-[#ECECEC] p-0.5 bg-white shadow-sm shrink-0" />
        ) : (
          <h1 className="text-sm sm:text-lg font-black tracking-tighter text-brand-navy border border-brand-navy/10 px-2 sm:px-3 py-1 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            {isManagement ? 'Admin' : 'PhotoX'}
          </h1>
        )}

        {(totalCount !== undefined || cloudCount !== undefined) && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brand-navy/10 bg-brand-navy/5 shadow-inner">
            <div className="flex items-center gap-1 font-mono text-[12px] text-brand-navy/90">
              <span className="font-bold">{totalCount ?? photos.length}</span>
              <span className="text-[12px] font-sans font-medium text-brand-navy/80 ml-0.5">{t.photosUnit}</span>
              {isManagement && (
                <>
                  <span className="text-brand-navy/30 mx-1">/</span>
                  <span className="font-bold text-blue-600">{cloudCount ?? '?'}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 p-1 rounded-2xl bg-brand-navy/5 border border-brand-navy/10 shadow-inner">
          {/* Refresh Component */}
          <div className="relative flex items-center" ref={dropdownRef}>
            <button 
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shadow-sm border border-brand-navy/10 active:scale-95 ${isRefreshing ? 'bg-blue-600 text-white animate-spin' : 'bg-white text-brand-navy/60 hover:text-blue-600'}`}
            >
              <RefreshCcw size={16} />
            </button>
            {isManagement && (
              <button 
                onClick={() => setShowRefreshMenu(!showRefreshMenu)}
                className="absolute -right-1.5 bottom-0 w-4 h-4 rounded-full bg-brand-navy text-white flex items-center justify-center border-2 border-white"
              >
                <ChevronDown size={10} />
              </button>
            )}
            {isManagement && <RefreshMenu show={showRefreshMenu} isInfiniteMode={isInfiniteMode} t={t} toggleInfinite={() => setIsInfiniteMode(!isInfiniteMode)} />}
          </div>

          {isPublic && <LanguageSwitcher variant={variant} />}

          {isManagement && adminPreviewMode === 'private' && (
            <button 
              onClick={handleBatchAiIdentifyTrigger}
              className="h-9 sm:h-10 px-2.5 rounded-xl border border-brand-navy/10 bg-white text-brand-navy/60 hover:text-blue-600 shadow-sm transition-all"
            >
              <Sparkles size={18} />
            </button>
          )}

          {isManagement && (
            <button 
              onClick={() => setAdminPreviewMode?.(adminPreviewMode === 'private' ? 'public' : 'private')}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${adminPreviewMode === 'public' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-brand-navy/40 border border-brand-navy/10 shadow-sm'}`}
            >
              <Globe size={18} />
            </button>
          )}

          {isPublic && onExit && (
            <button 
              onClick={onExit}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all bg-green-600 hover:bg-green-700 text-white shadow-md active:scale-95 shrink-0"
              title={lang === 'zh' ? '返回管理端' : lang === 'ms' ? 'Kembali ke Urus' : 'Back to Admin'}
            >
              <Globe size={18} />
            </button>
          )}

          {!isPublic && (
            <div className="relative" ref={toolsRef}>
              <button 
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-brand-navy/10 text-brand-navy/60 flex items-center justify-center shadow-sm"
              >
                <Menu size={18} />
              </button>
              <ToolsMenu 
                show={showToolsMenu} 
                t={t} 
                handleOpenSettings={handleManageClick}
                isStaffMode={isEffectiveStaffMode}
                handleExitStaffMode={handleExitStaffMode}
                currentLang={lang}
                onSetLang={(l) => setAppLang(l as any)}
                adminPreviewMode={adminPreviewMode}
                toggleAdminPreviewMode={() => setAdminPreviewMode?.(adminPreviewMode === 'private' ? 'public' : 'private')}
              />
            </div>
          )}
        </div>

        {isPublic && !user && (
          <button 
            onClick={handleLogin}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-[#ECECEC] text-[#555555] flex items-center justify-center shadow-sm"
          >
            <LogIn size={16} />
          </button>
        )}
      </div>
    </header>
  );
};
