import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { NativePopover } from '#src/components/ui/NativePopover.js';
import { LanguageSwitcher } from '#src/components/ui/LanguageSwitcher.js';
import { useTranslation } from '#src/hooks/index.js';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

export interface HeaderMenuProps {
  items: MenuItem[];
  user?: {
    email?: string | null;
    photoUrl?: string | null;
    role?: string | null;
  } | null;
  onSignOut?: () => void;
  triggerStyle?: string;
  userBadgeLabel?: string;
}

export function HeaderMenu({ items, user, onSignOut, triggerStyle, userBadgeLabel }: HeaderMenuProps) {
  const { t } = useTranslation();

  return (
    <NativePopover
      align="end"
      trigger={
        <button
          type="button"
          className={cn(
            "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-all outline-none border shadow-xs",
            triggerStyle || "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
          )}
          title={t('adminMenu', '選單')}
        >
          <Icon name="menu" size={20} />
        </button>
      }
    >
      <div className="flex flex-col min-w-[220px] p-1 gap-1">
        {user ? (
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none">
            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-white overflow-hidden text-[8px] shrink-0">
              {user?.photoUrl && user.photoUrl.trim() !== '' ? (
                <img src={user.photoUrl} referrerPolicy="no-referrer" alt="" />
              ) : (
                <Icon name="user" size={10} />
              )}
            </div>
            <span className="truncate">{user.email?.split("@")[0] || userBadgeLabel || 'User'}</span>
          </div>
        ) : (
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
            {t('guestLabel', '訪客')}
          </div>
        )}

        <div className="h-px bg-slate-100 my-1 mx-2" />

        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            if (item.divider) {
              return <div key={item.id} className="h-px bg-slate-100 my-1 mx-2" />;
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left w-full",
                  item.danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon name={item.icon} size={16} className={item.danger ? "text-red-500" : "text-slate-500"} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="h-px bg-slate-100 my-1 mx-2" />
        <div className="px-3 py-1.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
            <Icon name="globe" size={12} />
            <span>{t('language') || '语言 / Language'}</span>
          </div>
          <LanguageSwitcher mode="segmented" />
        </div>

        {user && onSignOut && (
          <>
            <div className="h-px bg-slate-100 my-1 mx-2" />
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left w-full"
            >
              <Icon name="log-out" size={16} />
              {t('signOutAccount', '登出')}
            </button>
          </>
        )}
      </div>
    </NativePopover>
  );
}
