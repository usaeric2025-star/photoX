import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React from 'react';
import { LogIn, LayoutDashboard, RefreshCw, Camera, Menu, User as UserIcon, LogOut, Settings, LayoutGrid, MonitorPlay } from 'lucide-react';
import { useAuth, useUIStore, useShallow, useSettings, usePermission } from '@/hooks';
import { Dropdown, DropdownItem, DropdownSeparator } from '../../shared/Dropdown';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';
import { translations } from "@/locales";

interface PublicHeaderProps {
  totalCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PublicHeader({ totalCount, onRefresh, isRefreshing }: PublicHeaderProps) {
  const { user, isLoading, logout } = useAuth();
  const { settings } = useSettings();
  const { role } = usePermission();
  const update = useUIStore((s) => s.update);
  const navigate = useRouterSafe().navigate;
  const location = useRouterSafe().location;
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

  // Public header should always be white, regardless of user role
  const headerBgClass = "bg-white border-slate-200 text-slate-800";

  return (
    <header className={`h-14 sm:h-16 shrink-0 border-b px-2.5 sm:px-4 flex items-center justify-between font-sans transition-colors duration-300 relative ${headerBgClass}`}>
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0 flex-nowrap">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            className="h-7 sm:h-9 w-auto object-contain shrink-0" 
            alt="Logo" 
            onLoad={() => {
              if (settings?.logo_url && settings.logo_url !== cachedLogoUrl) {
                setCachedLogoUrl(settings.logo_url);
              }
            }}
          />
        ) : (
          <div className="flex items-center gap-1 font-bold tracking-tighter">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm text-white shrink-0 ${role === 'admin' ? 'bg-indigo-600' : role === 'staff' ? 'bg-amber-600' : 'bg-blue-600'}`}>
              <Camera size={14} className="sm:size-4 stroke-[2.5]" />
            </div>
            <span className="text-sm sm:text-lg font-black tracking-tighter">
              PHOT<span className={`${role === 'admin' ? 'text-indigo-600' : role === 'staff' ? 'text-amber-600' : 'text-blue-600'}`}>O</span>X
            </span>
            {role === 'admin' ? (
              <span className="text-[8px] sm:text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
                Admin
              </span>
            ) : role === 'staff' ? (
              <span className="text-[8px] sm:text-[9px] font-black bg-amber-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
                Staff
              </span>
            ) : null}
          </div>
        )}

        {totalCount !== undefined && (
          <span className="px-1.5 py-0.5 rounded-full bg-white/60 border border-slate-200/20 text-slate-500 text-[9px] font-bold whitespace-nowrap shrink-0 uppercase tracking-widest leading-none">
            {t.photosCount(totalCount)}
          </span>
        )}
      </div>

      {/* 右侧：刷新 & 管理/登录入口 */}
      <div className="flex items-center gap-0.5 sm:gap-2 flex-nowrap shrink-0">
        
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 sm:w-9 sm:h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-full transition-all active:scale-90 shrink-0"
            title={t.refresh}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        {/* 3. 切换至管理后台按钮 (与 AdminHeader 统一使用 LayoutDashboard 图案的按钮和外观) */}
        <button
          onClick={handleAuthAction}
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 border bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
          title={isAdmin ? t.viewModePublic : t.viewModeAdmin}
        >
          <LayoutDashboard className="size-4.5 sm:size-5" />
        </button>

        {/* 4. 菜单 (语言、登录、退出) */}
        <Dropdown
          align="right"
          trigger={
            <div className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-all cursor-pointer shrink-0 border border-slate-100 bg-white">
              <Menu size={22} />
            </div>
          }
        >
             {user ? (
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden text-[8px]">
                    {user.photo_url ? (
                      <img src={user.photo_url} referrerPolicy="no-referrer" alt="" />
                    ) : (
                      <UserIcon size={10} />
                    )}
                  </div>
                  {user.email?.split("@")[0]}
                </div>
             ) : (
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                  {t.guestLabel}
                </div>
             )}
             
             <DropdownSeparator />

            <div className="px-2 py-1.5 flex flex-col gap-1">
              <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">{t.systemLabel}</span>
              {user && (
                <>
                  {!isAdmin && (
                    <DropdownItem
                      icon={<LayoutDashboard size={16} />}
                      onClick={() => navigate({ to: '/admin' })}
                    >
                      {t.adminPanel}
                    </DropdownItem>
                  )}
                  <DropdownItem
                    icon={<Settings size={16} />}
                    onClick={() => {
                       navigate({ to: '/admin' });
                       useUIStore.getState().update({ activeScreen: 'settings' });
                    }}
                  >
                    {t.systemSettings}
                  </DropdownItem>
                  <DropdownItem
                    icon={<LayoutGrid size={16} />}
                    onClick={() => navigate({ to: '/admin/tasks' })}
                  >
                    {t.taskCenter}
                  </DropdownItem>
                </>
              )}
              <div className="mt-1">
                <LanguageSwitcher mode="segmented" />
              </div>
            </div>

            {user && (
              <>
                <DropdownSeparator />
                <DropdownItem
                  icon={<LogOut size={16} />}
                  danger
                  onClick={() => logout()}
                >
                  {t.logoutAccount}
                </DropdownItem>
              </>
            )}
        </Dropdown>
      </div>
    </header>
  );
}
