import { Theme } from '#src/types/index.js';
import { userAtom, totalCountAtom, signOut } from '#src/store/index.js';
import React from 'react';
import { useAtomValue } from 'jotai';
import { cn } from '#lib/utils.js';
import {  activeTaskCountAtom } from '#lib/store/index.js';
import {  useSettings, useAdminActions, usePermission, useTranslation } from '#src/hooks/index.js';
import { useAppLocation } from '#src/hooks/core/index.js';
import { storage } from '#lib/storage.js';
import { useIsMultiSelect, useSelectionActions } from '#src/hooks/index.js';
import { AdminHeaderLogo } from './AdminHeaderLogo.js';
import { AdminHeaderActions } from './AdminHeaderActions.js';

interface AdminHeaderProps {
  className?: string;
}

export function AdminHeader({ className }: AdminHeaderProps) {
  const { handleBatchAiIdentifyTrigger, isAiAnalyzing } = useAdminActions();
  const user = useAtomValue(userAtom);
  
  const { settings } = useSettings();
  const [location, setLocation] = useAppLocation();
  const { t, lang } = useTranslation();
  const isMultiSelect = useIsMultiSelect();
  const { toggleMode } = useSelectionActions();
  const taskCount = useAtomValue(activeTaskCountAtom);
  const uiTotalCount = useAtomValue(totalCountAtom);
  const totalCount = uiTotalCount || 0;

  const cachedSettings = React.useMemo(() => {
    try {
      const item = storage.getItem('cached_settings');
      if (item) return JSON.parse(item);
    } catch (e) {}
    return null;
  }, []);

  const logoUrl = settings?.logoUrl || cachedSettings?.logoUrl || null;

  const isStaff = user?.role === 'staff' || user?.id === 'staff-user';

  const theme = {
    bg: isStaff 
      ? "bg-slate-900 border-b border-emerald-900/50 text-slate-100 border-t-2 border-t-emerald-500 shadow-sm" 
      : "bg-slate-900 border-b border-indigo-900/50 text-slate-100 border-t-2 border-t-indigo-500 shadow-sm",
    logoColor: isStaff ? "bg-emerald-600" : "bg-indigo-600",
    logoText: "text-white font-bold",
    button: "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white transition-all outline-none rounded-lg flex items-center justify-center border",
    buttonActive: isStaff 
      ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 transition-all outline-none rounded-lg flex items-center justify-center border"
      : "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 transition-all outline-none rounded-lg flex items-center justify-center border",
    badge: "bg-slate-800/90 border-slate-700 text-slate-300",
    badgeLabel: "text-slate-400",
    badgeVal: "text-white font-bold",
    popoverTrigger: "bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white border transition-all outline-none rounded-lg flex items-center justify-center"
  };

  return (
    <header className={cn("h-14 shrink-0 border-b px-3 sm:px-4 flex items-center justify-between font-sans relative flex-nowrap overflow-hidden", theme.bg, className)}>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <AdminHeaderLogo 
          logoUrl={logoUrl}
          totalCount={totalCount}
          theme={theme as Theme}
        />
        <div className="h-4 w-px bg-slate-700 mx-0.5 hidden lg:block shrink-0" />
        <h1 className="text-sm font-semibold text-slate-200 hidden lg:block truncate shrink-0">
          {isStaff ? '員工工作台' : t('adminPanelTitle')}
        </h1>
      </div>
      <div className="flex items-center gap-2 flex-nowrap shrink-0">
        <AdminHeaderActions 
          multiSelect={isMultiSelect}
          toggleMode={toggleMode}
          batchAiIdentify={handleBatchAiIdentifyTrigger}
          isAiAnalyzing={isAiAnalyzing}
          taskCount={taskCount}
          handleAuthAction={() => {
            sessionStorage.setItem('preferred_mode', 'public');
            setLocation('/');
          }}
          t={t}
          user={user}
          signOut={signOut}
          lang={lang}
          theme={theme as Theme}
        />
      </div>
    </header>
  );
}
