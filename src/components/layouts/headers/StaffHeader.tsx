import React from 'react';
import { Zap, User as UserIcon, LogOut, Settings } from 'lucide-react';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useSettings } from '@/hooks';
import { logoutPublic } from '@/lib/publicAuth';

interface StaffHeaderProps {
  totalCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function StaffHeader({ totalCount, onRefresh, isRefreshing }: StaffHeaderProps) {
  const { user } = useAuth();
  const { settings } = useSettings();

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-indigo-50 border-indigo-200 z-30 font-sans overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter whitespace-nowrap shrink-0 flex items-center">
          {settings?.logo_url ? (
            <img src={settings.logo_url} className="h-6 sm:h-7 w-auto object-contain shrink-0" alt="Logo" />
          ) : (
            <span>PHOT<span className="text-blue-600">O</span>X</span>
          )}
          <span className="ml-2 text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-100 px-1.5 sm:px-2 py-0.5 rounded-full border border-indigo-200">Staff</span>
        </h1>
        {totalCount !== undefined && (
          <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-white/50 text-slate-500 text-[9px] sm:text-[10px] font-bold whitespace-nowrap shrink-0">
            {totalCount} PHOTOS
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
        <LanguageSwitcher variant="staff-workspace" />

        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 rounded-full transition-all active:scale-90 shrink-0"
            title="无量刷新"
          >
            <Zap size={18} className={isRefreshing ? 'animate-pulse' : ''} />
          </button>
        )}

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-9 flex items-center justify-center bg-white/80 rounded-full hover:bg-white transition-all cursor-pointer shrink-0 outline-none border border-indigo-200">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white overflow-hidden shrink-0">
                {user.photo_url ? (
                  <img src={user.photo_url} alt="avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={14} className="text-white" />
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl p-2 bg-white shadow-xl border border-slate-200 z-50">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Staff Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />
              <DropdownMenuItem 
                onClick={() => logoutPublic()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 cursor-pointer transition-colors mt-1"
              >
                <LogOut size={16} />
                <span className="text-sm font-semibold">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
