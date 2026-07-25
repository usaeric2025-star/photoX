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
    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
      {!showDefaultLogo ? (
        <img 
          src={logoUrl!} 
          className="h-7 sm:h-9 w-auto object-contain shrink-0" 
          alt="Logo" 
          
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex items-center gap-1 font-bold tracking-tighter">
          <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm text-white shrink-0", theme.logoColor)}>
            <Icon name="camera" size={14} className="sm:size-4 stroke-[2.5]" />
          </div>
          <span className={cn("text-sm sm:text-lg font-black tracking-tighter", theme.logoText)}>
            PHOT<span>O</span>X
          </span>
          {role === 'admin' ? (
            <span className="text-[8px] sm:text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
              Admin
            </span>
          ) : role === 'staff' ? (
            <span className="text-[8px] sm:text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
              Staff
            </span>
          ) : (
            <span className="text-[8px] sm:text-[9px] font-black bg-slate-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1 select-none">
              Guest
            </span>
          )}
        </div>
      )}
      <div className={cn("flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold border rounded-full px-2 sm:px-2.5 py-1 select-none shrink-0 cursor-default justify-center shadow-sm whitespace-nowrap", theme.badge)}>
        <span className={cn("uppercase tracking-tighter text-[9px] shrink-0", theme.badgeLabel)}>{t('totalStock')}</span>
        <span className={cn("shrink-0", theme.badgeVal)}>
          {totalCount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
