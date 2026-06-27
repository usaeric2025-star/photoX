import { useAppRouter } from '@/lib/router';
import React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { useAuth, activeTaskCountSelector, useTask, useSignal, isMultiSelect as isMultiSelectSignal } from '@/lib/store';
import { useUI, useSettings, useAdminBatchActions, usePermission } from '@/hooks';
import { useAppQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { NativePopover } from '@/components/ui/NativePopover';
import { LanguageSwitcher } from '../../ui/LanguageSwitcher';
import { translations } from "@/locales";
import { storage } from '@/services/storage';
import { isTaskDrawerOpenSignal } from '@/lib/store';
import { useSelection } from '@/features/selection';

interface AdminHeaderProps {
  className?: string;
}

export function AdminHeader({ className }: AdminHeaderProps) {
  const { handleBatchAiIdentifyTrigger: batchAiIdentifyRaw } = useAdminBatchActions();
  const handleBatchAiIdentifyTrigger = () => batchAiIdentifyRaw([]); // Passing empty allPhotos or we need to fix the contract
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const { role, isAdmin, isStaff } = usePermission();
  const { navigate } = useAppRouter();

  const lang = useUI((s) => s.appLang);
  const { toggleMode } = useSelection();
  const multiSelect = useSignal(isMultiSelectSignal);
  const patch = useUI((s) => s.patch);
  const t = translations[lang as keyof typeof translations] || translations.en;

  const taskCount = useTask(activeTaskCountSelector);

  const { data: totalCountData } = useAppQuery(
    ['photos', 'count', 'total'],
    async () => {
      const res = await api.photos.count.$post({ json: { isAdminMode: true } });
      if (!res.ok) return 0;
      const json = await res.json();
      return json.data as number;
    },
    { dedupingInterval: 60 * 1000 }
  );
  const totalCount = totalCountData ?? 0;

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
    navigate.home();
  };

  const currentRole = isStaff ? role : 'public';

  const theme = {
    admin: {
      bg: "bg-slate-950 border-indigo-950 text-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-indigo-500 before:via-purple-500 before:to-pink-500 shadow-[inset_0_-1px_0_0_rgba(99,102,241,0.15),0_4px_30px_rgba(0,0,0,0.5)]",
      logoColor: "bg-indigo-600",
      logoText: "text-slate-100",
      button: "bg-slate-900/80 hover:bg-slate-800 text-indigo-400 border-indigo-900/50 hover:text-indigo-200 hover:border-indigo-700/80 hover:shadow-[0_0_12px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center border",
      buttonActive: "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center border",
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
      buttonActive: "bg-amber-600 text-white border-amber-500 hover:bg-amber-500 hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center border",
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
      buttonActive: "bg-blue-600 text-white border-blue-600 hover:bg-blue-550 hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center border",
      badge: "bg-slate-50 border-slate-200 text-slate-600",
      badgeLabel: "text-slate-500",
      badgeVal: "text-slate-900 font-bold",
      popoverTrigger: "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600 hover:text-slate-900 border hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center"
    }
  }[currentRole];

  return (
    <header className={cn("h-14 sm:h-16 shrink-0 border-b px-2.5 sm:px-4 flex items-center justify-between font-sans transition-all duration-300 relative", theme.bg, className)}>
      {/* 左侧：Logo & 计数 */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap z-10">
        {logoUrl && logoUrl.trim() !== '' ? (
          <img 
              src={logoUrl} 
              className="h-7 sm:h-9 w-auto object-contain shrink-0" 
              alt="Logo" 
              loading="lazy"
            />
          ) : (
            <div className="flex items-center gap-1 font-bold tracking-tighter">
              <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm text-white shrink-0", theme.logoColor)}>
                <Icon name="camera" size={14} className="sm:size-4 stroke-[2.5]" />
              </div>
              <span className={cn("text-sm sm:text-lg font-black tracking-tighter", theme.logoText)}>
                PHOT<span>O</span>X
              </span>
              {isAdmin ? (
                <span className="text-[8px] sm:text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
                  Admin
                </span>
              ) : isStaff ? (
                <span className="text-[8px] sm:text-[9px] font-black bg-amber-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
                  Staff
                </span>
              ) : (
                <span className="text-[8px] sm:text-[9px] font-black bg-slate-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
                  Guest
                </span>
              )}
            </div>
          )}
  
        {/* 照片总数展示 */}
          <div className={cn("flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold border rounded-full px-2 sm:px-2.5 py-1 select-none shrink-0 cursor-default justify-center shadow-sm whitespace-nowrap", theme.badge)}>
            <span className={cn("uppercase tracking-tighter text-[9px] shrink-0", theme.badgeLabel)}>{lang === 'zh' ? '总存量' : 'Total'}</span>
            <span className={cn("shrink-0", theme.badgeVal)}>
              {totalCount.toLocaleString()}
            </span>
          </div>
        </div>
  
        {/* 右侧：管理/登录入口 */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0 z-10">
          
          {/* 选择模式/多选 按钮 */}
          <button
// AdminHeader.tsx
            onClick={toggleMode}
            className={cn("w-9 h-9 sm:w-10 sm:h-10", multiSelect ? theme.buttonActive : theme.button)}
            title={multiSelect ? t.exitSelectMode : t.selectModeToggle}
          >
            <Icon name="check-square" className="size-4 sm:size-4.5" />
          </button>
  
          {/* AI 智能识别 按钮 next to check screen */}
          <button
            onClick={() => {
               handleBatchAiIdentifyTrigger();
            }}
            className={cn("w-9 h-9 sm:w-10 sm:h-10", theme.button)}
            title={t.aiSmartIdentify}
          >
            <Icon name="sparkles" className="size-4 sm:size-4.5 animate-pulse" />
          </button>
  
          {/* Task Queue 門戶 */}
          <button
            onClick={() => isTaskDrawerOpenSignal.set(true)}
            className={cn("w-9 h-9 sm:w-10 sm:h-10 relative shrink-0", theme.button)}
            title="查看任務進度"
          >
            <Icon name="activity" className="size-4 sm:size-4.5" />
            {taskCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] w-auto px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-slate-950 animate-in zoom-in duration-300">
                {taskCount > 99 ? '99+' : taskCount}
              </span>
            )}
          </button>

          {/* 3. 切换至前台体验按钮 (标准 LayoutDashboard 样式) */}
          <button
            onClick={handleAuthAction}
            className={cn("w-9 h-9 sm:w-10 sm:h-10", theme.button)}
            title={t.viewModePublic}
          >
            <Icon name="layout-dashboard" className="size-4 sm:size-4.5" />
          </button>
  
          {/* 4. 菜单 (语言、登录、退出) */}
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
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-white overflow-hidden text-[8px]">
                    {user?.photo_url && user.photo_url.trim() !== '' ? (
                      <img src={user.photo_url} referrerPolicy="no-referrer" alt="" loading="lazy" />
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

              <div className="px-2 py-1.5 flex flex-col gap-1 w-full">
                <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">{t.systemLabel}</span>
                {isStaff && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate.settings()}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
                    >
                      <Icon name="settings" size={16} />
                      {t.systemSettings}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate.adminTasks()}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
                    >
                      <Icon name="layout-grid" size={16} />
                      {t.taskCenter}
                    </button>
                  </>
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
