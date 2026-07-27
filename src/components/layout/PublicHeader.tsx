import React from 'react';
import { useAtomValue } from 'jotai';
import { userAtom, signOut } from '#src/store/index.js';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { HeaderLogo, ModeSwitch, HeaderMenu, MenuItem } from './header/index.js';
import { usePublicSettings, useTranslation, useInvalidatePhotos, useIsMultiSelect, useSelectionActions } from '#src/hooks/index.js';
import { useAppLocation } from '#src/hooks/core/index.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { storage } from '#lib/storage.js';
import { ADMIN_ROUTES } from '#src/constants/config.js';

interface PublicHeaderProps {
  totalCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function PublicHeader({ totalCount, onRefresh, isRefreshing, className }: PublicHeaderProps) {
  const user = useAtomValue(userAtom);
  const { data: settings } = usePublicSettings();
  const [, setLocation] = useAppLocation();
  const { t } = useTranslation();
  const { invalidateAll } = useInvalidatePhotos();

  const [internalRefreshing, setInternalRefreshing] = React.useState(false);
  const [isCooldown, setIsCooldown] = React.useState(false);

  const handleRefresh = React.useCallback(() => {
    if (isRefreshing || internalRefreshing || isCooldown) return;
    setIsCooldown(true);
    if (onRefresh) {
      onRefresh();
    } else {
      setInternalRefreshing(true);
      invalidateAll();
      setTimeout(() => setInternalRefreshing(false), 600);
    }
    setTimeout(() => setIsCooldown(false), 1500);
  }, [onRefresh, invalidateAll, isRefreshing, internalRefreshing, isCooldown]);

  const activeRefreshing = isRefreshing || internalRefreshing;

  const cachedSettings = React.useMemo(() => {
    try {
      const item = storage.getItem('cached_settings');
      if (item) return JSON.parse(item);
    } catch (e) {}
    return null;
  }, []);

  const logoUrl = settings?.logoUrl || cachedSettings?.logoUrl || null;

  const isStaff = user?.role === 'staff' || user?.id === 'staff-user';
  const isAdmin = user?.role === 'admin' || user?.id === 'admin-user';
  const isManagementUser = Boolean(isStaff || isAdmin);
  const isMultiSelect = useIsMultiSelect();
  const { toggleMode } = useSelectionActions();

  const handleSwitchToAdmin = () => {
    sessionStorage.setItem('preferred_mode', 'admin');
    setLocation(ADMIN_ROUTES.HOME);
  };

  const menuItems: MenuItem[] = [
    {
      id: 'adminWorkspace',
      icon: 'layout-dashboard',
      label: isStaff ? t('staffWorkspace', '員工工作台') : t('adminPanel', '管理後台'),
      onClick: handleSwitchToAdmin,
    }
  ];

  return (
    <header className={cn("h-14 shrink-0 px-4 flex items-center justify-between relative bg-white border-b border-slate-200 text-slate-800 shadow-xs", className)}>
      <HeaderLogo 
        logoUrl={logoUrl}
        totalCount={totalCount}
      />

      <div className="flex items-center gap-2 flex-nowrap shrink-0">
        {isManagementUser && (
          <button
            type="button"
            onClick={toggleMode}
            className={cn(
              "w-10 h-10 shrink-0 border transition-all outline-none rounded-lg flex items-center justify-center shadow-xs",
              isMultiSelect
                ? "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700"
                : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900"
            )}
            title={isMultiSelect ? t('exitSelectMode') : t('selectModeToggle')}
          >
            <Icon name="check-square" size={20} />
          </button>
        )}

        <button 
          type="button"
          onClick={handleRefresh}
          disabled={activeRefreshing || isCooldown}
          className="w-10 h-10 shrink-0 bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 border transition-all outline-none rounded-lg flex items-center justify-center shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('refresh')}
        >
          {activeRefreshing ? <LoadingSpinner size="xs" /> : <Icon name="refresh-cw" size={20} />}
        </button>

        <ModeSwitch
          mode="to-admin"
          onClick={handleSwitchToAdmin}
          title={isStaff ? t('staffWorkspace', '員工工作台') : t('adminPanel', '管理後台')}
        />

        <HeaderMenu
          items={menuItems}
          user={user}
          onSignOut={user ? signOut : undefined}
        />
      </div>
    </header>
  );
}
