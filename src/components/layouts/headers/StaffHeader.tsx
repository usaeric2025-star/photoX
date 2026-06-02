import React from 'react';
import { Zap, User as UserIcon, LogOut, Settings, Menu, LayoutDashboard, RefreshCw, Camera } from 'lucide-react';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useSettings, useUIStore, useShallow } from '@/hooks';
import { logoutPublic } from '@/lib/publicAuth';
import { cn } from '@/lib/utils';

interface StaffHeaderProps {
  totalCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function StaffHeader({ totalCount, onRefresh, isRefreshing }: StaffHeaderProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const update = useUIStore((s) => s.update);

  const handleGoToAdmin = () => {
    update({ viewMode: 'private', activeScreen: 'home' });
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-indigo-50 border-indigo-200 z-30 font-sans overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        {settings?.logo_url ? (
          <img src={settings.logo_url} className="h-6 sm:h-7 w-auto object-contain shrink-0" alt="Logo" />
        ) : (
          <div className="flex items-center gap-1.5 font-bold tracking-tighter text-slate-900 cursor-pointer" onClick={handleGoToAdmin}>
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm text-white shrink-0">
              <Camera size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-lg font-black tracking-tighter">
              PHOT<span className="text-blue-600">O</span>X
            </span>
          </div>
        )}
        {totalCount !== undefined && (
          <span className="px-1.5 py-0.5 rounded-full bg-white/50 text-slate-500 text-[10px] font-bold whitespace-nowrap shrink-0 border border-indigo-100">
            {totalCount} PHOTOS
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 rounded-full transition-all active:scale-90 shrink-0"
            title="刷新数据"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-pulse' : ''} />
          </button>
        )}

        {user && (
          <div className="flex items-center gap-1 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="h-9 w-9 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 rounded-full transition-all cursor-pointer shrink-0 outline-none border border-indigo-200">
                <Menu size={18} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl p-2 bg-white shadow-xl border border-slate-200 z-50">
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white overflow-hidden text-[8px]">
                    {user.photo_url ? <img src={user.photo_url} referrerPolicy="no-referrer" /> : <UserIcon size={10} />}
                  </div>
                  Staff Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />                
                <div className="px-3 py-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Language</span>
                  <LanguageSwitcher variant="staff-workspace" />
                </div>
                <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />
                <DropdownMenuItem 
                  onClick={handleGoToAdmin}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors border-none"
                >
                  <Settings size={16} />
                  <span className="text-sm font-semibold">管理后台</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => logoutPublic()}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 cursor-pointer transition-colors mt-1 border-none"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-semibold">退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={handleGoToAdmin}
              className="w-9 h-9 flex items-center justify-center bg-white/60 text-indigo-600 rounded-full hover:bg-white transition-all active:scale-95 shrink-0 ml-1 border border-indigo-100"
              title="返回管理后台"
            >
              <LayoutDashboard size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
