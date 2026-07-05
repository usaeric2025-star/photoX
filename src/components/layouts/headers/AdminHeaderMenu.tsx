import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { NativePopover } from '#src/components/ui/NativePopover.js';
import { LanguageSwitcher } from '#src/components/ui/LanguageSwitcher.js';
import { User, Theme, TranslationType } from '#src/types/index.js';
import { Navigation } from '#lib/router/index.js';

interface AdminHeaderMenuProps {
  user: User | null;
  signOut: () => void;
  navigate: Navigation;
  isStaff: boolean;
  theme: Theme;
  t: (key: string, ...args: any[]) => any;
  lang: string;
}

export function AdminHeaderMenu({ user, signOut, navigate, isStaff, theme, t, lang }: AdminHeaderMenuProps) {
  return (
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
              {user?.photoUrl && user.photoUrl.trim() !== '' ? (
                <img src={user.photoUrl} referrerPolicy="no-referrer" alt="" loading="lazy" />
              ) : (
                <Icon name="user" size={10} />
              )}
            </div>
            {user ? user.email?.split("@")[0] : t('loginTitleStaff')}
          </div>
        ) : (
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
            {t('guestLabel')}
          </div>
        )}
        
        <div className="h-px bg-slate-100 my-1 w-full" />
 
        <div className="px-2 py-1.5 flex flex-col gap-1 w-full">
          <span className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">{t('systemLabel')}</span>
          {isStaff && (
            <>
              <button
                type="button"
                onClick={() => navigate.settings()}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
              >
                <Icon name="settings" size={16} />
                {t('systemSettings')}
              </button>
              <button
                type="button"
                onClick={() => navigate.adminTasks()}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 text-gray-700"
              >
                <Icon name="layout-grid" size={16} />
                {t('taskCenter')}
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
              {t('signOutAccount')}
            </button>
          </>
        )}
      </div>
    </NativePopover>
  );
}
