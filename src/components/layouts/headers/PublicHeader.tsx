import React from 'react';
import { LogIn, LayoutDashboard, RefreshCw, Camera, Menu, User as UserIcon, LogOut, Settings, LayoutGrid, MonitorPlay } from 'lucide-react';
import { useAuth, useUIStore, useShallow, useSettings } from '@/hooks';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutPublic } from "@/lib/publicAuth";
import { translations } from "@/lib/translations";

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
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const lang = useUIStore(s => s.appLang);
  const t = translations[lang as keyof typeof translations] || translations.en;

  const [cachedLogoUrl, setCachedLogoUrl] = React.useState<string | null>(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem('photox_cached_settings') : null;
      if (item) {
        const parsed = JSON.parse(item);
        return parsed.logo_url || null;
      }
    } catch (e) {
      // ignore
    }
    return null;
  });

  const logoUrl = settings?.logo_url || cachedLogoUrl;

  const handleAuthAction = () => {
    if (isAdmin) {
      navigate({ to: '/' });
    } else {
      navigate({ to: '/admin' });
    }
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b px-2 sm:px-4 flex items-center justify-between bg-white border-slate-200 z-header font-sans overflow-hidden">
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            className="h-8 sm:h-9 w-auto object-contain shrink-0" 
            alt="Logo" 
            onLoad={() => {
              if (settings?.logo_url && settings.logo_url !== cachedLogoUrl) {
                setCachedLogoUrl(settings.logo_url);
              }
            }}
          />
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
            {t.photosCount(totalCount)}
          </span>
        )}
      </div>

      {/* 右侧：刷新 & 管理/登录入口 */}
      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all active:scale-90 shrink-0"
            title={t.refresh}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        {/* 3. 切换至管理后台按钮 (与 AdminHeader 统一使用 LayoutDashboard 图案的按钮和外观) */}
        <button
          onClick={handleAuthAction}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 ml-1 border bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
          title={isAdmin ? t.viewModePublic : t.viewModeAdmin}
        >
          <LayoutDashboard size={20} />
        </button>

        {/* 4. 菜单 (语言、登录、退出) */}
        <DropdownMenu>
          <DropdownMenuTrigger className="h-10 w-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-all cursor-pointer shrink-0 outline-none ml-1 border border-slate-100">
            <Menu size={22} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 mt-2 rounded-2xl p-2 bg-white shadow-2xl border border-slate-200 z-dropdown text-slate-700"
          >
             {user ? (
                <>
                  <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden text-[8px]">
                      {user.photo_url ? (
                        <img src={user.photo_url} referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon size={10} />
                      )}
                    </div>
                    {user.email?.split("@")[0]}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />
                </>
             ) : (
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t.guestLabel}
                </DropdownMenuLabel>
             )}

            <div className="px-2 py-1.5 flex flex-col gap-1.5">
              <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.systemLabel}</span>
              {user && (
                <>
                  {!isAdmin && (
                    <DropdownMenuItem
                      onClick={() => navigate({ to: '/admin' })}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors border-none"
                    >
                      <LayoutDashboard size={16} />
                      <span className="text-sm font-semibold">{t.adminPanel}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                       navigate({ to: '/admin' });
                       useUIStore.getState().update({ activeScreen: 'settings' });
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors border-none"
                  >
                    <Settings size={16} />
                    <span className="text-sm font-semibold">{t.systemSettings}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate({ to: '/admin/tasks' })}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors border-none"
                  >
                    <LayoutGrid size={16} />
                    <span className="text-sm font-semibold">{t.taskCenter}</span>
                  </DropdownMenuItem>
                </>
              )}
              <LanguageSwitcher mode="segmented" />
            </div>

            <DropdownMenuSeparator className="mx-2 my-1 bg-slate-100" />

            {user && (
              <>
                <DropdownMenuItem
                  onClick={() => logoutPublic()}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer transition-colors mt-1 border-none"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-semibold">{t.logoutAccount}</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
