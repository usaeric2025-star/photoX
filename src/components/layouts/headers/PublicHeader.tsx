import React from 'react';
import { LogIn, LayoutDashboard, RefreshCw, Camera } from 'lucide-react';
import { useAuth, useUIStore, useShallow, useSettings } from '@/hooks';
import { useNavigate } from '@tanstack/react-router';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';

interface PublicHeaderProps {
  totalCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PublicHeader({ totalCount, onRefresh, isRefreshing }: PublicHeaderProps) {
  const { user, isLoading } = useAuth();
  const { settings } = useSettings();
  const update = useUIStore((s) => s.update);
  const navigate = useNavigate();

  const handleAuthAction = () => {
    // Navigate directly to /admin
    navigate({ to: '/admin' });
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-white border-slate-200 z-30 font-sans overflow-hidden">
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        {settings?.logo_url ? (
          <img src={settings.logo_url} className="h-6 sm:h-7 w-auto object-contain shrink-0" alt="Logo" />
        ) : (
          <div className="flex items-center gap-1.5 font-bold tracking-tighter text-slate-900">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm text-white shrink-0">
              <Camera size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-lg font-black tracking-tighter">
              PHOT<span className="text-blue-600">O</span>X
            </span>
          </div>
        )}
        {totalCount !== undefined && (
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold whitespace-nowrap shrink-0 uppercase tracking-widest leading-none">
            {totalCount} Photos
          </span>
        )}
      </div>

      {/* 右侧：刷新 & 管理/登录入口 */}
      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
        <LanguageSwitcher variant="ghost" />
        
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all active:scale-90 shrink-0"
            title="刷新数据"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        {isLoading ? (
          <div className="w-9 h-9 rounded-full bg-slate-50 animate-pulse shrink-0" />
        ) : (
          <button
            onClick={handleAuthAction}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95 text-[11px] font-bold shrink-0 ml-1 shadow-sm leading-none"
            title={user ? "进入管理后台" : "登录系统"}
          >
            {user ? (
              <>
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">管理中心</span>
              </>
            ) : (
              <>
                <LogIn size={14} />
                <span className="hidden sm:inline">登录</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
