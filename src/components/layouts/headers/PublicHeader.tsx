import { useAppRouter } from '@/lib/router/useAppRouter';
import React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon'; // Keep one or two critical ones as standard imports for P0 performance
import { useAuth } from '@/lib/store';
import { useUI, useShallow, usePublicSettings, usePermission } from '@/hooks';
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
  const { user, isLoading, signOut } = useAuth();
  const { data: settings } = usePublicSettings();
  const { role } = usePermission();
  const update = useUI((s) => s.update);
  const { navigate, route } = useAppRouter();
  const isAdmin = route === 'admin' || route === 'adminGroup';

  const lang = useUI(s => s.appLang);
  const t = translations[lang as keyof typeof translations] || translations.en;

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

  const logoUrl = settings?.logo_url || cachedSettings?.logo_url || null;

  const handleAuthAction = () => {
    if (isAdmin) {
      navigate.home();
    } else {
      navigate.admin();
    }
  };

  const currentRole = isAdmin ? ((role === 'admin' || role === 'staff') ? role : 'public') : 'public';

  const theme = {
    admin: {
      bg: "bg-slate-950 border-indigo-950 text-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-indigo-500 before:via-purple-500 before:to-pink-500 shadow-[inset_0_-1px_0_0_rgba(99,102,241,0.15),0_4px_30px_rgba(0,0,0,0.5)]",
      logoColor: "bg-indigo-600",
      logoText: "text-slate-100 font-bold",
      button: "bg-slate-900/80 hover:bg-slate-800 text-indigo-400 border-indigo-900/50 hover:text-indigo-200 hover:border-indigo-700/80 hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center border",
      badge: "bg-indigo-950/80 border-indigo-900/50 text-indigo-300",
      badgeLabel: "text-indigo-400",
      badgeVal: "text-indigo-200 font-bold",
      popoverTrigger: "bg-slate-900/80 hover:bg-slate-800 border-indigo-900/50 text-slate-300 hover:text-slate-100 border hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center"
    },
    staff: {
      bg: "bg-[#fefaf4] border-amber-200 text-stone-800 bg-gradient-to-r from-[#fefaf4] via-amber-50/50 to-orange-50/30 relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-amber-400 before:to-orange-500 shadow-[0_4px_20px_rgba(245,158,11,0.06)]",
      logoColor: "bg-amber-600",
      logoText: "text-stone-900 font-extrabold",
      button: "bg-amber-100/60 hover:bg-amber-200/80 text-amber-700 border-amber-200 hover:text-amber-900 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center border",
      badge: "bg-amber-50 border-amber-200 text-amber-700",
      badgeLabel: "text-stone-500",
      badgeVal: "text-stone-900 font-bold",
      popoverTrigger: "bg-amber-100/60 hover:bg-amber-200/80 border-amber-200 text-amber-700 hover:text-amber-900 border hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center"
    },
    public: {
      bg: "bg-white/90 backdrop-blur-md border-slate-200 text-slate-800 shadow-[0_1px_10px_rgba(0,0,0,0.02)]",
      logoColor: "bg-slate-800",
      logoText: "text-slate-800 font-bold",
      button: "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80 hover:text-slate-900 hover:border-slate-300 hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center border",
      badge: "bg-slate-50 border-slate-200 text-slate-600",
      badgeLabel: "text-slate-500",
      badgeVal: "text-slate-900 font-bold",
      popoverTrigger: "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600 hover:text-slate-900 border hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center"
    }
  }[currentRole];

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
            {role === 'admin' ? (
              <span className="text-[10px] font-bold bg-indigo-600/10 text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wide ml-1 select-none">
                Admin
              </span>
            ) : role === 'staff' ? (
              <span className="text-[10px] font-bold bg-amber-600/10 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-wide ml-1 select-none">
                Staff
              </span>
            ) : null}
          </div>
        )}

        {totalCount !== undefined && (
          <div className={cn("flex items-center gap-2 text-[10px] sm:text-xs font-bold border rounded-full px-2.5 py-1 select-none shrink-0 cursor-default justify-center shadow-sm", theme.badge)}>
            <span className={cn("uppercase tracking-tighter text-[9px]", theme.badgeLabel)}>{lang === 'zh' ? '总存量' : 'Total'}</span>
            <span className={theme.badgeVal}>
              {totalCount}
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
            title={t.refresh}
          >
            {isRefreshing ? <LoadingSpinner size="xs" /> : <Icon name="refresh-cw" size={16} className="sm:size-[18px]" />}
          </button>
        )}

        {/* 3. 切换至管理后台/登录按钮 (Apple Style) - 僅員工及未登錄遊客可見 */}
        {(!user || role === 'admin' || role === 'staff') && (
          <button
            onClick={handleAuthAction}
            className={cn("w-9 h-9 sm:w-10 sm:h-10", theme.button)}
            title={role === 'admin' || role === 'staff' ? (isAdmin ? t.viewModePublic : t.viewModeAdmin) : t.adminPanel}
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
            {role === 'admin' || role === 'staff' ? (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden text-[8px]">
                  {user?.photo_url && user.photo_url.trim() !== '' ? (
                    <img src={user.photo_url} referrerPolicy="no-referrer" alt="" />
                  ) : (
                  <Icon name="user" size={10} />
                  )}
                </div>
                {user ? user.email?.split("@")[0] : (lang === 'zh' ? '员工 (Staff)' : 'Staff')}
              </div>
            ) : (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                {t.guestLabel}
              </div>
            )}
            
            <div className="h-px bg-slate-100 my-1 w-full" />

            <div className="px-2 py-1.5 flex flex-col gap-1 w-full border-t border-slate-50 mt-1">
              <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">
                {lang === 'zh' ? '联系我们' : 'Connect'}
              </span>
              {settings?.facebook && (
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
                >
                  <Icon name="facebook" size={16} className="text-[#1877F2]" />
                  Facebook
                </a>
              )}
              {settings?.instagram && (
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-pink-50 text-gray-700"
                >
                  <Icon name="instagram" size={16} className="text-[#E4405F]" />
                  Instagram
                </a>
              )}
            </div>

            <div className="px-2 py-1.5 flex flex-col gap-1 w-full">
              <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">{t.systemLabel}</span>
              {role === 'admin' || role === 'staff' ? (
                <>
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => navigate.admin()}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
                    >
                      <Icon name="layout-dashboard" size={16} />
                      {t.adminPanel}
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
                  {t.adminPanel}
                </button>
              )}
              <div className="mt-1">
                <LanguageSwitcher mode="segmented" />
              </div>
            </div>

            {(role === 'admin' || role === 'staff') && (
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
