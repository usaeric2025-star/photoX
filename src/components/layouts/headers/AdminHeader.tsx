import { useAppRouter } from '#lib/router/index.js';
import React from 'react';
import { cn } from '#lib/utils.js';
import { useAuth, activeTaskCountSignal, useSignal } from '#lib/store/index.js';
import { useComputed } from '@preact/signals-react';
import { useUI, useSettings, useAdminBatchActions, usePermission, useTranslation } from '#src/hooks/index.js';
import { useAppQuery } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { translations, TranslationType } from '#src/locales/index.js';
import { storage } from '#src/services/storage/index.js';
import { useIsMultiSelect, useSelectionActions } from '#src/hooks/index.js';
import { AdminHeaderLogo } from './AdminHeaderLogo.js';
import { AdminHeaderActions } from './AdminHeaderActions.js';
import { AdminHeaderMenu } from './AdminHeaderMenu.js';

interface AdminHeaderProps {
  className?: string;
}

export function AdminHeader({ className }: AdminHeaderProps) {
  const { handleBatchAiIdentifyTrigger } = useAdminBatchActions();
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const { role, isAdmin, isStaff } = usePermission();
  const { navigate } = useAppRouter();

  const { t, lang } = useTranslation();
  const isMultiSelect = useIsMultiSelect();
  const { toggleMode } = useSelectionActions();

  const taskCount = useComputed(() => activeTaskCountSignal.value).value;

  const uiTotalCount = useUI((s) => s.totalCount);
  const totalCount = uiTotalCount || 0;

  const cachedSettings = React.useMemo(() => {
    try {
      const item = storage.getItem('cached_settings');
      if (item) return JSON.parse(item);
    } catch (e) {}
    return null;
  }, []);

  const logoUrl = settings?.logoUrl || cachedSettings?.logoUrl || null;
  const currentRole = isStaff ? role : 'public';

  const themes = {
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
      bg: "bg-white border-slate-200 text-slate-800 shadow-[0_1px_10px_rgba(0,0,0,0.02)]",
      logoColor: "bg-slate-800",
      logoText: "text-slate-800 font-bold",
      button: "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80 hover:text-slate-900 hover:border-slate-300 hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center border",
      buttonActive: "bg-blue-600 text-white border-blue-600 hover:bg-blue-550 hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center border",
      badge: "bg-slate-50 border-slate-200 text-slate-600",
      badgeLabel: "text-slate-500",
      badgeVal: "text-slate-900 font-bold",
      popoverTrigger: "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600 hover:text-slate-900 border hover:scale-105 active:scale-95 transition-all outline-none rounded-full flex items-center justify-center"
    }
  };

  const theme = themes[currentRole as keyof typeof themes] || themes.public;

  return (
    <header className={cn("h-14 sm:h-16 shrink-0 border-b px-2.5 sm:px-4 flex items-center justify-between font-sans transition-all duration-300 relative", theme.bg, className)}>
      <AdminHeaderLogo 
        logoUrl={logoUrl} 
        isAdmin={isAdmin} 
        isStaff={isStaff} 
        totalCount={totalCount} 
        theme={theme} 
      />

      <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0 z-10">
        <AdminHeaderActions 
          multiSelect={isMultiSelect}
          toggleMode={toggleMode}
          batchAiIdentify={handleBatchAiIdentifyTrigger}
          taskCount={taskCount}
          handleAuthAction={() => navigate.home()}
          theme={theme}
          t={t}
        />

        <AdminHeaderMenu 
          user={user}
          signOut={signOut}
          navigate={navigate}
          isStaff={isStaff}
          theme={theme}
          t={t}
          lang={lang}
        />
      </div>
    </header>
  );
}
