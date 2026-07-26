import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useTranslation, usePermission } from '#src/hooks/index.js';
import { Theme } from '#src/types/index.js';

interface AdminHeaderLogoProps {
  logoUrl?: string | null;
  totalCount: number;
  theme: Theme;
}

export function AdminHeaderLogo({ logoUrl, totalCount, theme }: AdminHeaderLogoProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = React.useState(false);
  const { role } = usePermission();
  const showDefaultLogo = !logoUrl || logoUrl.trim() === '' || imgError;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-nowrap">
      {!showDefaultLogo ? (
        <div className="flex items-center gap-2 shrink-0">
          <img 
            src={logoUrl!} 
            className="h-7 sm:h-8 w-auto object-contain shrink-0" 
            alt="Logo" 
            onError={() => setImgError(true)}
          />
          {role === 'admin' ? (
            <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider select-none shadow-xs shrink-0">
              Admin
            </span>
          ) : role === 'staff' ? (
            <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider select-none shadow-xs shrink-0">
              Staff
            </span>
          ) : (
            <span className="text-[10px] font-bold bg-slate-500 text-white px-2 py-0.5 rounded-md uppercase tracking-wider select-none shadow-xs shrink-0">
              Guest
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 font-bold tracking-tighter shrink-0">
          <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-sm text-white shrink-0", theme.logoColor)}>
            <Icon name="camera" size={14} className="sm:size-4 stroke-[2.5]" />
          </div>
          <span className={cn("text-sm sm:text-base font-black tracking-tighter shrink-0", theme.logoText)}>
            PHOT<span>O</span>X
          </span>
          {role === 'admin' ? (
            <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider select-none shadow-xs shrink-0">
              Admin
            </span>
          ) : role === 'staff' ? (
            <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider select-none shadow-xs shrink-0">
              Staff
            </span>
          ) : (
            <span className="text-[10px] font-bold bg-slate-500 text-white px-2 py-0.5 rounded-md uppercase tracking-wider select-none shadow-xs shrink-0">
              Guest
            </span>
          )}
        </div>
      )}
      <div className={cn("hidden md:flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold border rounded-full px-2 sm:px-2.5 py-0.5 select-none shrink-0 cursor-default justify-center shadow-sm whitespace-nowrap", theme.badge)}>
        <span className={cn("uppercase tracking-tighter text-[9px] shrink-0", theme.badgeLabel)}>{t('totalStock')}</span>
        <span className={cn("shrink-0", theme.badgeVal)}>
          {totalCount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
