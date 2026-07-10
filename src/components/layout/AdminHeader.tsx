import { useAppRouter } from '#lib/router/index.js';
import React from 'react';
import { cn } from '#lib/utils.js';
import { useAuth, activeTaskCountSignal, useSignal } from '#lib/store/index.js';
import { useUI, useSettings, useAdminBatchActions, usePermission, useTranslation } from '#src/hooks/index.js';
import { useAppQuery } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { storage } from '#lib/storage.js';
import { useIsMultiSelect, useSelectionActions } from '#src/hooks/index.js';
import { AdminHeaderLogo } from './AdminHeaderLogo.js';
import { AdminHeaderActions } from './AdminHeaderActions.js';

interface AdminHeaderProps {
  className?: string;
}

export function AdminHeader({ className }: AdminHeaderProps) {
  const { handleBatchAiIdentifyTrigger } = useAdminBatchActions();
  const user = useAuth(s => s.user);
  const signOut = useAuth(s => s.signOut);
  const { settings } = useSettings();
  const { role } = usePermission();
  const { navigate } = useAppRouter();

  const { t, lang } = useTranslation();
  const isMultiSelect = useIsMultiSelect();
  const { toggleMode } = useSelectionActions();

  const taskCount = useSignal(activeTaskCountSignal);

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

  const theme = {
    bg: "bg-white border-slate-200 text-slate-800",
    logoColor: "bg-slate-800",
    logoText: "text-slate-800 font-bold",
    button: "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300 transition-all outline-none rounded-lg flex items-center justify-center border",
    buttonActive: "bg-primary text-white border-primary hover:bg-primary/90 transition-all outline-none rounded-lg flex items-center justify-center border",
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
          role={role}
          totalCount={totalCount}
          theme={theme}
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
          taskCount={taskCount}
          handleAuthAction={() => navigate.home()}
          theme={theme}
          t={t}
          user={user}
          signOut={signOut}
          lang={lang}
        />
      </div>
    </header>
  );
}
