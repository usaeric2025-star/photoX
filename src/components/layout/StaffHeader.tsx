import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { HeaderLogo, ModeSwitch, HeaderMenu, MenuItem } from './header/index.js';
import { useAppLocation } from '#src/hooks/core/index.js';
import { userAtom, totalCountAtom, signOut } from '#src/store/index.js';
import { activeTaskCountAtom, isTaskDrawerOpen } from '#lib/store/index.js';
import { useSettings, useAdminActions, useTranslation, useIsMultiSelect, useSelectionActions } from '#src/hooks/index.js';
import { storage } from '#lib/storage.js';
import { ADMIN_ROUTES } from '#src/constants/config.js';
import { Theme } from '#src/types/index.js';

interface StaffHeaderProps {
  className?: string;
}

export function StaffHeader({ className }: StaffHeaderProps) {
  const [, setLocation] = useAppLocation();
  const user = useAtomValue(userAtom);
  const { handleBatchAiIdentifyTrigger, isAiAnalyzing } = useAdminActions();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const isMultiSelect = useIsMultiSelect();
  const { toggleMode } = useSelectionActions();
  const taskCount = useAtomValue(activeTaskCountAtom);
  const uiTotalCount = useAtomValue(totalCountAtom);
  const totalCount = uiTotalCount || 0;
  const setTaskDrawerOpen = useSetAtom(isTaskDrawerOpen);

  const cachedSettings = React.useMemo(() => {
    try {
      const item = storage.getItem('cached_settings');
      if (item) return JSON.parse(item);
    } catch (e) {}
    return null;
  }, []);

  const logoUrl = settings?.logoUrl || cachedSettings?.logoUrl || null;

  const theme: Theme = {
    bg: "bg-slate-900 border-b border-emerald-900/50 text-slate-100 border-t-2 border-t-emerald-500 shadow-sm",
    logoColor: "bg-emerald-600",
    logoText: "text-white font-bold",
    button: "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white transition-all outline-none rounded-lg flex items-center justify-center border",
    buttonActive: "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 transition-all outline-none rounded-lg flex items-center justify-center border",
    badge: "bg-slate-800/90 border-slate-700 text-slate-300",
    badgeLabel: "text-slate-400",
    badgeVal: "text-white font-bold",
    popoverTrigger: "bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white border transition-all outline-none rounded-lg flex items-center justify-center"
  };

  const handleSwitchToPublic = () => {
    sessionStorage.setItem('preferred_mode', 'public');
    setLocation('/');
  };

  const menuItems: MenuItem[] = [
    {
      id: 'settings',
      icon: 'settings',
      label: t('settings', '系統設置'),
      onClick: () => setLocation(ADMIN_ROUTES.SETTINGS)
    },
    {
      id: 'toPublic',
      icon: 'eye',
      label: t('viewModePublic', '查看前台視圖'),
      onClick: handleSwitchToPublic
    }
  ];

  return (
    <header className={cn("h-14 shrink-0 border-b px-3 sm:px-4 flex items-center justify-between font-sans relative flex-nowrap overflow-hidden", theme.bg, className)}>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <HeaderLogo 
          logoUrl={logoUrl}
          totalCount={totalCount}
          badge={{ text: 'Staff', variant: 'staff' }}
          theme={theme}
        />
        <div className="h-4 w-px bg-slate-700 mx-0.5 hidden lg:block shrink-0" />
        <h1 className="text-sm font-semibold text-slate-200 hidden lg:block truncate shrink-0">
          {t('staffWorkspace', '員工工作台')}
        </h1>
      </div>

      <div className="flex items-center gap-2 flex-nowrap shrink-0">
        <button
          type="button"
          onClick={toggleMode}
          className={cn("w-10 h-10", isMultiSelect ? theme.buttonActive : theme.button)}
          title={isMultiSelect ? t('exitSelectMode') : t('selectModeToggle')}
        >
          <Icon name="check-square" size={20} />
        </button>

        <button
          type="button"
          onClick={() => handleBatchAiIdentifyTrigger()}
          disabled={isAiAnalyzing}
          className={cn("w-10 h-10 disabled:opacity-50 disabled:cursor-not-allowed", theme.button)}
          title={t('aiSmartIdentify')}
        >
          {isAiAnalyzing ? (
            <Icon name="loader" size={20} className="animate-spin text-emerald-400" />
          ) : (
            <Icon name="sparkles" size={20} />
          )}
        </button>

        <button
          type="button"
          onClick={() => setTaskDrawerOpen(true)}
          className={cn("w-10 h-10 relative shrink-0", theme.button)}
          title={t('taskCenter')}
        >
          <Icon name="activity" size={20} />
          {taskCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] w-auto px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-slate-900 animate-in zoom-in duration-300">
              {taskCount > 99 ? '99+' : taskCount}
            </span>
          )}
        </button>

        <ModeSwitch
          mode="to-public"
          onClick={handleSwitchToPublic}
          title={t('viewModePublic', '查看前台視圖')}
          buttonStyle={theme.button}
        />

        <HeaderMenu
          items={menuItems}
          user={user}
          onSignOut={signOut}
          triggerStyle={theme.button}
          userBadgeLabel="Staff"
        />
      </div>
    </header>
  );
}
