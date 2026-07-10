import { useAppRouter } from '#lib/router/index.js';
import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useAuth } from '#lib/store/index.js';
import { useUI, usePublicSettings, usePermission, UIStoreState, useTranslation } from '#src/hooks/index.js';
import { NativePopover } from '#src/components/ui/NativePopover.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { LanguageSwitcher } from '#src/components/ui/LanguageSwitcher.js';
import { storage } from '#lib/storage.js';

interface PublicHeaderProps {
  totalCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function PublicHeader({ totalCount, onRefresh, isRefreshing, className }: PublicHeaderProps) {
  const user = useAuth(s => s.user);
  const isLoading = useAuth(s => s.isLoading);
  const signOut = useAuth(s => s.signOut);
  const { data: settings } = usePublicSettings();
  const { isStaff, can } = usePermission();
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
      bg: "bg-white border-slate-200 text-slate-800",
      logoColor: "bg-slate-900",
      logoText: "text-slate-900 font-bold",
      button: "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300 transition-all outline-none rounded-lg flex items-center justify-center border shadow-sm",
      badge: "bg-slate-50 border-slate-200 text-slate-600",
      badgeLabel: "text-slate-500",
      badgeVal: "text-slate-900 font-bold",
      popoverTrigger: "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 border transition-all outline-none rounded-lg flex items-center justify-center shadow-sm"
    }
  }['public'];

  return (
    <header className={cn("h-14 shrink-0 border-b px-4 flex items-center justify-between transition-all duration-300 relative", theme.bg, className)}>
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-4 shrink-0 flex-nowrap z-10">
        {logoUrl && logoUrl.trim() !== '' ? (
          <img 
            src={logoUrl} 
            className="h-8 w-auto object-contain shrink-0 rounded-lg" 
            alt="Logo" 
            loading="lazy"
          />
        ) : (
          <div className="flex items-center gap-1.5 px-1">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-sm text-white shrink-0", theme.logoColor)}>
              <Icon name="camera" size={16} />
            </div>
            <span className={cn("text-base font-bold tracking-tight", theme.logoText)}>
              PhotoX
            </span>
          </div>
        )}

        {totalCount !== undefined && (
          <div className={cn("flex items-center gap-1.5 text-[10px] font-medium border rounded-full px-2 py-0.5 select-none shrink-0 cursor-default justify-center shadow-sm whitespace-nowrap", theme.badge)}>
            <span className={cn("uppercase tracking-wider text-[9px] shrink-0", theme.badgeLabel)}>{t('totalStock')}</span>
            <span className={cn("shrink-0", theme.badgeVal)}>
              {totalCount.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* 右侧：刷新 & 管理/登录入口 */}
      <div className="flex items-center gap-2 flex-nowrap shrink-0 z-10">
        
        {onRefresh && (
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn("w-9 h-9", theme.button)}
            title={t('refresh')}
          >
            {isRefreshing ? <LoadingSpinner size="xs" /> : <Icon name="refresh-cw" size={18} />}
          </button>
        )}

        {/* 3. 切换至管理后台/登录按钮 (Apple Style) - 僅員工及未登錄遊客可見 */}
        {(!user || isStaff) && (
          <button
            onClick={handleAuthAction}
            className={cn("w-9 h-9", theme.button)}
            title={isStaff ? (isAdminRoute ? t('viewModePublic') : t('viewModeAdmin')) : t('adminPanel')}
          >
            <Icon name="layout-dashboard" size={18} />
          </button>
        )}

        {/* 4. 菜单 (語言、登錄、退出) */}
        <NativePopover
          align="end"
          trigger={
            <button className={cn("h-9 w-9", theme.popoverTrigger)}>
              <Icon name="menu" size={18} />
            </button>
          }
        >
          <div className="flex flex-col min-w-[220px] p-1 gap-1">
            {isStaff ? (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-white overflow-hidden text-[8px] shrink-0">
                  {user?.photoUrl && user.photoUrl.trim() !== '' ? (
                    <img src={user.photoUrl} referrerPolicy="no-referrer" alt="" loading="lazy" />
                  ) : (
                    <Icon name="user" size={10} />
                  )}
                </div>
                <span className="truncate">{user ? user.email?.split("@")[0] : t('loginTitleStaff')}</span>
              </div>
            ) : (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                {t('guestLabel')}
              </div>
            )}

            <div className="h-px bg-slate-100 my-1 mx-2" />

            <div className="flex flex-col gap-0.5">
              {(() => {
                const items = [];
                items.push({ id: 'gallery', icon: 'image' as const, label: t('gallery', '相冊圖庫'), onClick: () => navigate.home() });
                if (isStaff) {
                  items.push({ id: 'admin', icon: 'layout-dashboard' as const, label: t('viewModeAdmin', '管理後台'), onClick: () => navigate.admin() });
                  if (can('photo:batch-edit')) {
                    items.push({ id: 'batchEdit', icon: 'layers' as const, label: t('batchEdit', '批量編輯'), onClick: () => navigate.adminBatchEdit() });
                  }
                  if (can('system:settings')) {
                    items.push({ id: 'diagnostics', icon: 'activity' as const, label: t('diagnostics', '系統診斷'), onClick: () => navigate.adminDiagnostics() });
                    items.push({ id: 'errorLogs', icon: 'file-text' as const, label: t('errorLogs', '錯誤日誌'), onClick: () => navigate.adminDiagnosticsLogs() });
                    items.push({ id: 'divider1', divider: true });
                    items.push({ id: 'settings', icon: 'settings' as const, label: t('settings', '系統設置'), onClick: () => navigate.settings() });
                  }
                } else {
                  items.push({ id: 'admin', icon: 'log-in' as const, label: t('adminPanel', '管理後台'), onClick: () => navigate.admin() });
                }

                return items.map((item) => {
                  if ('divider' in item && item.divider) {
                    return <div key={item.id} className="h-px bg-slate-100 my-1 mx-2" />;
                  }
                  return (
                    <button 
                      key={item.id}
                      onClick={item.onClick}
                      className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left w-full"
                    >
                      <Icon name={(item as any).icon} size={16} className="text-slate-500" />
                      {(item as any).label}
                    </button>
                  );
                });
              })()}
            </div>

            <div className="h-px bg-slate-100 my-1 mx-2" />

            <div className="px-2 py-1">
              <LanguageSwitcher mode="segmented" />
            </div>

            {isStaff && (
              <>
                <div className="h-px bg-slate-100 my-1 mx-2" />
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
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
