import { DevToolsTrigger } from '@/features/devtools';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon'; // Keep one or two critical ones as standard imports for P0 performance
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore, useShallow, usePublicSettings, usePermission } from '@/hooks';
import { NativePopover } from '@/components/ui/NativePopover';
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';
import { translations } from "@/locales";
import { storage } from '@/services/storage';

interface PublicHeaderProps {
  totalCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function PublicHeader({ totalCount, onRefresh, isRefreshing, className }: PublicHeaderProps) {
  const { user, isLoading, signOut } = useAuthStore();
  const { data: settings } = usePublicSettings();
  const { role } = usePermission();
  const update = useUIStore((s) => s.update);
  const navigate = useRouterSafe().navigate;
  const location = useRouterSafe().location;
  const isAdmin = location.pathname.startsWith('/admin');

  const lang = useUIStore(s => s.appLang);
  const t = translations[lang as keyof typeof translations] || translations.en;

  const [cachedLogoUrl, setCachedLogoUrl] = React.useState<string | null>(() => {
    try {
      const item = storage.getItem('photox_cached_settings');
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

  // Apple header style: white with blur and subtle bottom border
  const headerBgClass = "bg-surface-overlay backdrop-blur-2xl border-border-soft text-text-main";

  return (
    <header className={cn("h-14 sm:h-16 shrink-0 border-b px-2.5 sm:px-6 flex items-center justify-between transition-all duration-300 relative bg-surface-overlay", headerBgClass, className)}>
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0 flex-nowrap">
        <DevToolsTrigger>
          {logoUrl && logoUrl.trim() !== '' ? (
            <img 
              src={logoUrl} 
              className="h-8 sm:h-10 w-auto object-contain shrink-0" 
              alt="Logo" 
              loading="lazy"
              onLoad={() => {
                if (settings?.logo_url && settings.logo_url !== cachedLogoUrl) {
                  setCachedLogoUrl(settings.logo_url);
                }
              }}
            />
          ) : (
            <div className="flex items-center gap-1.5 px-1">
              <div className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm text-text-on-primary shrink-0",
                role === 'admin' ? 'bg-primary' : role === 'staff' ? 'bg-warning' : 'bg-primary'
              )}>
                <Icon name="camera" size={18} />
              </div>
              <span className="text-base sm:text-xl font-bold tracking-tight text-text-main">
                PhotoX
              </span>
              {role === 'admin' ? (
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wide ml-1 select-none">
                  Admin
                </span>
              ) : role === 'staff' ? (
                <span className="text-[10px] font-bold bg-warning/10 text-warning px-2 py-0.5 rounded-full uppercase tracking-wide ml-1 select-none">
                  Staff
                </span>
              ) : null}
            </div>
          )}
        </DevToolsTrigger>

        {totalCount !== undefined && (
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 select-none shrink-0 cursor-default justify-center shadow-sm">
            <span className="text-slate-500 uppercase tracking-tighter text-[9px]">{lang === 'zh' ? '总存量' : 'Total'}</span>
            <span className="text-slate-900 font-black">
              {totalCount}
            </span>
          </div>
        )}
      </div>

      {/* 右侧：刷新 & 管理/登录入口 */}
      <div className="flex items-center gap-2 flex-nowrap shrink-0">
        
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 bg-surface-soft text-text-sub hover:text-text-main disabled:opacity-50"
            title={t.refresh}
          >
            {isRefreshing ? <LoadingSpinner size="xs" /> : <Icon name="refresh-cw" size={18} />}
          </button>
        )}

        {/* 3. 切换至管理后台按钮 (Apple Style) */}
        <button
          onClick={handleAuthAction}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 bg-surface-soft text-text-sub hover:text-text-main"
          title={isAdmin ? t.viewModePublic : t.viewModeAdmin}
        >
          <Icon name="layout-dashboard" size={18} />
        </button>

        {/* 4. 菜单 (語言、登錄、退出) */}
        <NativePopover
          align="end"
          trigger={
            <div className="h-10 w-10 flex items-center justify-center text-text-sub hover:bg-surface-soft rounded-full transition-all cursor-pointer shrink-0">
            <Icon name="menu" size={18} />
            </div>
          }
        >
          <div className="flex flex-col gap-1 w-full min-w-[200px]">
            {user ? (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden text-[8px]">
                  {user.photo_url && user.photo_url.trim() !== '' ? (
                    <img src={user.photo_url} referrerPolicy="no-referrer" alt="" />
                  ) : (
                  <Icon name="user" size={10} />
                  )}
                </div>
                {user.email?.split("@")[0]}
              </div>
            ) : (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                {t.guestLabel}
              </div>
            )}
            
            <div className="h-px bg-slate-100 my-1 w-full" />

            <div className="px-2 py-1.5 flex flex-col gap-1 w-full">
              <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">{t.systemLabel}</span>
              {user && (
                <>
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => navigate({ to: '/admin' })}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
                    >
                      <Icon name="layout-dashboard" size={16} />
                      {t.adminPanel}
                    </button>
                  )}
                </>
              )}
              <div className="mt-1">
                <LanguageSwitcher mode="segmented" />
              </div>
            </div>

            {user && (
              <>
                <div className="h-px bg-slate-100 my-1 w-full" />
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-red-50 text-red-600"
                >
                <Icon name="log-out" size={16} />
                  {t.signOutAccount}
                </button>
              </>
            )}
          </div>
        </NativePopover>
      </div>
    </header>
  );
}
