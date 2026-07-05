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
        <h1 className="text-sm font-semibold text-slate-900 hidden sm:block">
          {t('adminPanelTitle')}
        </h1>
        <div className={cn("flex items-center gap-1.5 text-[10px] font-medium border rounded-full px-2 py-0.5 select-none shrink-0 cursor-default justify-center bg-slate-50 border-slate-100 text-slate-500 whitespace-nowrap")}>
          <span className="uppercase tracking-wider text-[9px]">{t('totalStock')}</span>
          <span className="text-slate-900 font-bold ml-1">
            {totalCount.toLocaleString()}
          </span>
        </div>
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
        />

        <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

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
