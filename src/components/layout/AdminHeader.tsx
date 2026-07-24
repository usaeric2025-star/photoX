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

  const theme = {
    bg: "bg-white border-slate-200 text-slate-800",
    logoColor: "bg-slate-800",
    logoText: "text-slate-800 font-bold",
    button: "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300 transition-all outline-none rounded-lg flex items-center justify-center border",
    buttonActive: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-all outline-none rounded-lg flex items-center justify-center border",
    badge: "bg-slate-50 border-slate-200 text-slate-600",
    badgeLabel: "text-slate-500",
    badgeVal: "text-slate-900 font-bold",
    popoverTrigger: "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 border transition-all outline-none rounded-lg flex items-center justify-center"
  };

  return (
    <header className={cn("h-14 shrink-0 border-b px-4 flex items-center justify-between font-sans transition-all duration-300 relative", theme.bg, className)}>
      <div className="flex items-center gap-4">
        <AdminHeaderLogo 
          logoUrl={logoUrl}
          totalCount={totalCount}
          theme={theme as any}
        />
        <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
        <h1 className="text-sm font-semibold text-slate-900 hidden sm:block">
          {t('adminPanelTitle')}
        </h1>
      </div>
      <div className="flex items-center gap-2 flex-nowrap shrink-0">
        <AdminHeaderActions 
          multiSelect={isMultiSelect}
          toggleMode={toggleMode}
          batchAiIdentify={handleBatchAiIdentifyTrigger}
          isAiAnalyzing={isAiAnalyzing}
          taskCount={taskCount}
          handleAuthAction={() => setLocation('/')}
          t={t}
          user={user}
          signOut={signOut}
          lang={lang}
          theme={theme as any}
        />
      </div>
    </header>
  );
}
