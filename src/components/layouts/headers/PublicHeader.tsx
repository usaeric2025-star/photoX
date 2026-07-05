import { useAppRouter } from '#lib/router/index.js';
import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useAuth } from '#lib/store/index.js';
import { useUI, usePublicSettings, usePermission, UIStoreState, useTranslation } from '#src/hooks/index.js';
import { NativePopover } from '#src/components/ui/NativePopover.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { LanguageSwitcher } from '#src/components/ui/LanguageSwitcher.js';
import { translations } from '#src/locales/index.js';
import { storage } from '#src/services/storage/index.js';

interface PublicHeaderProps {
  totalCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function PublicHeader({ totalCount, onRefresh, isRefreshing, className }: PublicHeaderProps) {
  const { user, isLoading, signOut } = useAuth();
  const { data: settings } = usePublicSettings();
  const { role, isStaff, isAdmin: isGlobalAdmin } = usePermission();
  const patch = useUI((s: UIStoreState) => s.patch);
  const { navigate, route } = useAppRouter();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isAdminRoute = route?.name === 'admin' || route?.name === 'adminGroup' || pathname.startsWith('/admin');
  const isGroupPage = route?.name === 'publicGroup' || route?.name === 'adminGroup' || pathname.startsWith('/group/') || pathname.startsWith('/admin/group/');

  const { t } = useTranslation();

  const cachedSettings = React.useMemo(() => {
    try {
      const item = storage.getItem('cached_settings');
      if (item) {
        return JSON.parse(item);
      }
    } catch (e) {
      // ignore
    }
    return null;
  }, []);

  const logoUrl = settings?.logoUrl || cachedSettings?.logoUrl || null;

  const handleAuthAction = () => {
    if (isAdminRoute) {
      navigate.home();
    } else {
      navigate.admin();
    }
  };

  const theme = {
    public: {
      bg: "bg-white border-slate-200 text-slate-800 shadow-[0_1px_10px_rgba(0,0,0,0.02)]",
      logoColor: "bg-slate-800",
      logoText: "text-slate-800 font-bold",
      button: "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80 hover:text-slate-900 hover:border-slate-300 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center border",
      badge: "bg-slate-50 border-slate-200 text-slate-600",
      badgeLabel: "text-slate-500",
      badgeVal: "text-slate-900 font-bold",
      popoverTrigger: "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600 hover:text-slate-900 border active:scale-95 transition-all outline-none rounded-full flex items-center justify-center"
    }
  }['public'];

  return (
    <header className={cn("h-14 sm:h-16 shrink-0 border-b px-2.5 sm:px-6 flex items-center justify-between transition-all duration-300 relative", theme.bg, className)}>
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0 flex-nowrap z-10">
        {logoUrl && logoUrl.trim() !== '' ? (
          <img 
            src={logoUrl} 
            className="h-8 sm:h-10 w-auto object-contain shrink-0 rounded-xl" 
            alt="Logo" 
            loading="lazy"
          />
        ) : (
          <div className="flex items-center gap-1.5 px-1">
            <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm text-text-on-primary shrink-0", theme.logoColor)}>
              <Icon name="camera" size={16} className="sm:size-[18px]" />
            </div>
            <span className={cn("text-base sm:text-lg font-bold tracking-tight", theme.logoText)}>
              PhotoX
            </span>
          </div>
        )}

        {totalCount !== undefined && (
          <div className={cn("flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold border rounded-full px-2 sm:px-2.5 py-1 select-none shrink-0 cursor-default justify-center shadow-sm whitespace-nowrap", theme.badge)}>
            <span className={cn("uppercase tracking-tighter text-[9px] shrink-0", theme.badgeLabel)}>{t('totalStock')}</span>
            <span className={cn("shrink-0", theme.badgeVal)}>
              {totalCount.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* 右侧：刷新 & 管理/登录入口 */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0 z-10">
        
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn("w-9 h-9 sm:w-10 sm:h-10", theme.button)}
            title={t('refresh')}
          >
            {isRefreshing ? <LoadingSpinner size="xs" /> : <Icon name="refresh-cw" size={16} className="sm:size-[18px]" />}
          </button>
        )}

        {/* 3. 切换至管理后台/登录按钮 (Apple Style) - 僅員工及未登錄遊客可見 */}
        {(!user || isStaff) && (
          <button
            onClick={handleAuthAction}
            className={cn("w-9 h-9 sm:w-10 sm:h-10", theme.button)}
            title={isStaff ? (isAdminRoute ? t('viewModePublic') : t('viewModeAdmin')) : t('adminPanel')}
          >
            <Icon name="layout-dashboard" size={16} className="sm:size-[18px]" />
          </button>
        )}

        {/* 4. 菜单 (語言、登錄、退出) */}
        <NativePopover
          align="end"
          trigger={
            <div className={cn("h-9 w-9 sm:h-10 sm:w-10", theme.popoverTrigger)}>
              <Icon name="menu" size={16} className="sm:size-[18px]" />
            </div>
          }
        >
          <div className="flex flex-col gap-1 w-full min-w-[200px]">
            {isStaff ? (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden text-[8px]">
                  {user?.photoUrl && user.photoUrl.trim() !== '' ? (
                    <img src={user.photoUrl} referrerPolicy="no-referrer" alt="" />
                  ) : (
                  <Icon name="user" size={10} />
                  )}
                </div>
                {user ? user.email?.split("@")[0] : t('staffUser')}
              </div>
            ) : (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                {t('guestLabel')}
              </div>
            )}
            
            <div className="h-px bg-slate-100 my-1 w-full" />

            <div className="px-2 py-1.5 flex flex-col gap-1 w-full border-t border-slate-50 mt-1">
              <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">
                {t('connectLabel')}
              </span>
            </div>

            <div className="px-2 py-1.5 flex flex-col gap-1 w-full">
              <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">{t('systemLabel')}</span>
              {isStaff ? (
                <>
                  {!isAdminRoute && (
                    <button
                      type="button"
                      onClick={() => navigate.admin()}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
                    >
                      <Icon name="layout-dashboard" size={16} />
                      {t('adminPanel')}
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate.admin()}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
                >
                  <Icon name="log-in" size={16} />
                  {t('adminPanel')}
                </button>
              )}
              <div className="mt-1">
                <LanguageSwitcher mode="segmented" />
              </div>
            </div>

            {isStaff && (
              <>
                <div className="h-px bg-slate-100 my-1 w-full" />
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-red-50 text-red-600"
                >
                <Icon name="log-out" size={16} />
                  {t('signOutAccount')}
                </button>
              </>
            )}
          </div>
        </NativePopover>
      </div>
    </header>
  );
}
