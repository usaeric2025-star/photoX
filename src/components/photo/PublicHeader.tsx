import React, { useState, useEffect } from 'react';
import { LogIn, RefreshCw, X, User as UserIcon, LogOut, Settings, Eye, EyeOff } from 'lucide-react';
import { checkPublicAuth, logoutPublic } from '@/lib/publicAuth';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { useGalleryStore, useShallow } from '@/store/galleryStore';
import { useSettings } from '@/hooks';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface PublicHeaderProps {
  variant?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onExit?: () => void;
  totalCount?: number;
  loginWithGoogle?: () => void;
  photos?: any[];
  handleBatchAiIdentifyTrigger?: () => void;
  handleManageClick?: () => void;
  cloudCount?: number;
  adminPreviewMode?: 'public' | 'private';
  setAdminPreviewMode?: (m: 'public' | 'private') => void;
}

export function PublicHeader({
  variant,
  onRefresh,
  isRefreshing,
  onExit,
  totalCount,
  loginWithGoogle,
  handleManageClick,
  adminPreviewMode,
  setAdminPreviewMode
}: PublicHeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { setActiveScreen } = useGalleryStore(useShallow(s => ({ setActiveScreen: s.setActiveScreen })));
  const { settings } = useSettings();

  useEffect(() => {
    let active = true;
    checkPublicAuth().then(res => {
      if (active) {
        setUser(res.user);
        setIsAuthLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className={cn(
      "h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between flex-nowrap z-30 font-sans overflow-hidden transition-colors",
      variant === 'full-management' ? "bg-red-50 hover:bg-red-50/80 border-red-200" :
      variant === 'staff-workspace' ? "bg-indigo-50 hover:bg-indigo-50/80 border-indigo-200" :
      "bg-white border-slate-200"
    )}>
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter whitespace-nowrap shrink-0 flex items-center">
          {settings?.logo_url ? (
             <img src={settings.logo_url} className="h-6 sm:h-7 w-auto object-contain shrink-0" alt="Logo" />
          ) : (
            <span>PHOT<span className="text-blue-600">O</span>X</span>
          )}
          {variant === 'full-management' && <span className="ml-2 text-[10px] sm:text-xs font-bold text-red-600 uppercase tracking-widest bg-red-100 px-1.5 sm:px-2 py-0.5 rounded-full">Admin</span>}
          {variant === 'staff-workspace' && <span className="ml-2 text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-100 px-1.5 sm:px-2 py-0.5 rounded-full">Staff</span>}
        </h1>
        {totalCount !== undefined && (
          <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] sm:text-[10px] font-bold whitespace-nowrap shrink-0">
            {totalCount} PHOTOS
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
        <LanguageSwitcher variant={variant as any} />

        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-full transition-colors disabled:opacity-50 shrink-0"
            title="Refresh"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}
        
        {isAuthLoading ? (
          <div className="w-9 h-9 rounded-full bg-slate-50 animate-pulse shrink-0" />
        ) : !user ? (
          loginWithGoogle && (
            <button 
              onClick={loginWithGoogle}
              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-full transition-all active:scale-[0.98] shrink-0"
              title="Admin Login"
            >
              <LogIn size={18} />
            </button>
          )
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
            <button 
              onClick={() => handleManageClick ? handleManageClick() : setActiveScreen('manage')}
              className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all active:scale-[0.98] shrink-0"
              title="Dashboard"
            >
              <Settings size={18} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="h-9 w-9 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-200 transition-all cursor-pointer shrink-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden shrink-0">
                  {user.photo_url ? (
                    <img src={user.photo_url} alt="avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={14} className="text-white" />
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl p-2 bg-white shadow-xl border border-slate-200 z-50">
                <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Account Settings
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />
                <DropdownMenuItem 
                  onClick={() => handleManageClick ? handleManageClick() : setActiveScreen('manage')}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <Settings size={16} />
                  <span className="text-sm font-semibold">Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => logoutPublic()}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 cursor-pointer transition-colors mt-1"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-semibold">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {onExit && (
          <button 
            onClick={onExit}
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-full transition-colors ml-0.5 shrink-0"
            title="Exit"
          >
            <X size={18} />
          </button>
        )}

        {adminPreviewMode && setAdminPreviewMode && (
          <button
            onClick={() => setAdminPreviewMode(adminPreviewMode === 'public' ? 'private' : 'public')}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-8 sm:h-9 rounded-full font-bold transition-all shrink-0 active:scale-95 text-[10px] sm:text-xs",
              adminPreviewMode === 'public' 
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            )}
            title={adminPreviewMode === 'public' ? 'Exit Public Preview' : 'Enter Public Preview'}
          >
            {adminPreviewMode === 'public' ? (
               <Eye size={14} />
            ) : (
               <EyeOff size={14} />
            )}
            <span className="hidden sm:inline">{adminPreviewMode === 'public' ? '公开预览' : '管理预览'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
