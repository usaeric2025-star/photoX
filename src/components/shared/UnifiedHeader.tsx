import React, { useState, useRef, useEffect } from 'react';
import { RefreshCcw, Globe, Menu, LogIn, Wrench, Sparkles, CheckSquare, Search, ChevronDown } from 'lucide-react';
import { useGalleryStore, useShallow } from '../../store';
import { useFeedback, useMultiSelect, useTasks, useSettings, useAuth, usePermission } from '../../hooks';
import { translations, LanguageCode } from '../../lib/translations';
import { Photo, AppSettings } from '../../types';
import { GalleryVariant } from '@/types/variant';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { loginWithGoogle } from '@/services/supabaseService';
import { RefreshMenu } from './RefreshMenu';
import { ToolsMenu } from './ToolsMenu';
import { useNavigate } from '@tanstack/react-router';
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
  const { user, isPending: isAuthPending } = useAuth();
  const { appLang, isStaffMode, activeScreen, setActiveScreen,
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

  const { role } = usePermission();

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
  const t = translations[lang as keyof typeof translations] || translations.en;

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

  const isEffectiveStaffMode = (variant === 'staff-workspace') || (isStaffMode && !user);

  let headerClass = "bg-white border-[#E2E8F0] shadow-sm";
  let modeBadge: React.ReactNode = null;

  if (isManagement) {
    if (adminPreviewMode === 'public') {
      headerClass = "bg-gradient-to-r from-emerald-50/90 to-green-50/40 border-emerald-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";
      modeBadge = (
        <span className="hidden xs:inline-flex text-[9px] font-black tracking-widest bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap">
          {lang === 'zh' ? '预览 / Preview' : lang === 'ms' ? 'Pratonton' : 'Preview'}
        </span>
      );
    } else if (isEffectiveStaffMode) {
      headerClass = "bg-gradient-to-r from-amber-50/90 to-orange-50/40 border-amber-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";
      modeBadge = (
        <span className="hidden xs:inline-flex text-[9px] font-black tracking-widest bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap">
          {lang === 'zh' ? '员工端 / Staff' : lang === 'ms' ? 'Kakitangan' : 'Staff'}
        </span>
      );
    } else {
      headerClass = "bg-gradient-to-r from-blue-50/90 to-indigo-50/40 border-blue-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";
      modeBadge = (
        <span className="hidden xs:inline-flex text-[9px] font-black tracking-widest bg-blue-500/10 text-blue-700 border border-blue-500/20 px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap">
          {lang === 'zh' ? '管理模式 / Admin' : lang === 'ms' ? 'Urus' : 'Admin'}
        </span>
      );
    }
  } else if (isStaffMode) {
    headerClass = "bg-gradient-to-r from-amber-50/90 to-orange-50/40 border-amber-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";
    modeBadge = (
      <span className="hidden xs:inline-flex text-[9px] font-black tracking-widest bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap">
        {lang === 'zh' ? '员工端 / Staff' : lang === 'ms' ? 'Kakitangan' : 'Staff'}
      </span>
    );
  } else {
    headerClass = "bg-white border-[#E2E8F0] shadow-sm";
    modeBadge = (
      <span className="hidden xs:inline-flex text-[9px] font-semibold text-slate-400 bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded-md whitespace-nowrap">
        {lang === 'zh' ? '展示厅 / Showcase' : lang === 'ms' ? 'Pameran' : 'Showcase'}
      </span>
    );
  }

  return (
    <header className={`shrink-0 z-[110] h-[58px] px-4 sm:px-6 flex items-center justify-between gap-1 sm:gap-4 border-b ${headerClass}`}>
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <div className="flex items-center gap-2 shrink-0">
          {fetchedSettings?.logo_url ? (
            <img src={fetchedSettings.logo_url} alt="Logo" className="h-8 w-auto object-contain rounded-xl border border-[#ECECEC] p-0.5 bg-white shadow-sm shrink-0" />
          ) : (
            <h1 className="text-sm sm:text-lg font-black tracking-tighter text-brand-navy border border-brand-navy/10 px-2 sm:px-3 py-1 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
              {isManagement ? 'Admin' : 'PhotoX'}
            </h1>
          )}
          {modeBadge}
        </div>

        {(totalCount !== undefined || cloudCount !== undefined) && (
          <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brand-navy/10 bg-brand-navy/5 shadow-inner whitespace-nowrap">
            <div className="flex items-center font-mono text-[11px] sm:text-[12px] text-brand-navy/90 whitespace-nowrap">
              <span className="font-bold text-brand-navy">{totalCount ?? photos.length}</span>
              {isManagement && (
                <>
                  <span className="text-brand-navy/30 mx-1 font-sans">/</span>
                  <span className="font-semibold text-brand-navy/40" title="Cloud count">{cloudCount ?? '?'}</span>
                </>
              )}
              <span className="text-[11px] font-sans font-medium text-brand-navy/55 ml-1">{t.photosUnit}</span>
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
                    handleOpenSettings={() => handleManageClick?.()}
                    isStaffMode={isEffectiveStaffMode}
                    handleExitStaffMode={handleExitStaffMode}
                    currentLang={lang}
                    onSetLang={(l) => setAppLang(l as any)}
                    adminPreviewMode={adminPreviewMode || 'private'}
                    toggleAdminPreviewMode={() => setAdminPreviewMode?.(adminPreviewMode === 'private' ? 'public' : 'private')}
                  />
                </div>
              )}
            </div>

            {isPublic && (
              !user ? (
                <button 
                  onClick={handleLogin}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-[#ECECEC] text-[#555555] flex items-center justify-center shadow-sm shrink-0 active:scale-95 transition-transform"
                  title="管理员登录"
                >
                  <LogIn size={16} />
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (role !== 'admin') {
                      showError('当前账号不是管理员，无权限访问管理后台。', 'UnifiedHeader');
                    } else {
                      navigate({ to: '/admin' as any });
                    }
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-[#ECECEC] text-[#555555] flex items-center justify-center shadow-sm shrink-0 active:scale-95 transition-transform"
                  title="管理工具"
                >
                  <Wrench size={16} />
                </button>
              )
            )}
          </div>
      </div>
    </header>
  );
};
