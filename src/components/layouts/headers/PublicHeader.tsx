import React from 'react';
import { LogIn, LayoutDashboard, RefreshCw } from 'lucide-react';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';
import { useAuth, useGalleryStore, useShallow, useSettings } from '@/hooks';
import { cn } from '@/lib/utils';

interface PublicHeaderProps {
  totalCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isStaff?: boolean;
}

export function PublicHeader({ totalCount, onRefresh, isRefreshing, isStaff }: PublicHeaderProps) {
  const { user, isLoading, loginWithGoogle } = useAuth();
  const { settings } = useSettings();
  const { setActiveScreen, setViewMode } = useGalleryStore(useShallow(s => ({
    setActiveScreen: s.setActiveScreen,
    setViewMode: s.setViewMode
  })));

  const handleGoToAdmin = () => {
    setViewMode('private');
    setActiveScreen('manage');
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-white border-slate-200 z-30 font-sans overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter whitespace-nowrap shrink-0 flex items-center">
          {settings?.logo_url ? (
            <img src={settings.logo_url} className="h-6 sm:h-7 w-auto object-contain shrink-0" alt="Logo" />
          ) : (
             <span>PHOT<span className="text-blue-600">O</span>X</span>
          )}
          {isStaff && (
            <span className="ml-2 text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-1.5 sm:px-2 py-1 rounded-full border border-indigo-100 leading-none">Staff</span>
          )}
        </h1>
        {totalCount !== undefined && (
          <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] sm:text-[10px] font-bold whitespace-nowrap shrink-0">
            {totalCount} PHOTOS
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
        <LanguageSwitcher variant={isStaff ? 'staff-workspace' : 'public-showcase'} />

        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-full transition-all active:scale-90 shrink-0"
            title="刷新数据"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        {isLoading ? (
          <div className="w-9 h-9 rounded-full bg-slate-50 animate-pulse shrink-0" />
        ) : !user ? (
          <button
            onClick={loginWithGoogle}
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-full transition-all active:scale-[0.9] shrink-0"
            title="管理员登录"
          >
            <LogIn size={18} />
          </button>
        ) : (
          <button
            onClick={handleGoToAdmin}
            className="flex items-center gap-2 px-3 h-9 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all active:scale-95 shadow-sm shrink-0"
            title="进入管理后台"
          >
            <LayoutDashboard size={16} />
            <span className="text-xs font-bold hidden sm:inline">管理中心</span>
          </button>
        )}
      </div>
    </header>
  );
}
