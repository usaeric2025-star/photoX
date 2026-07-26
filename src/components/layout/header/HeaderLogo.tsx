import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useTranslation } from '#src/hooks/index.js';
import { APP_CONFIG } from '#src/constants/config.js';
import { Theme } from '#src/types/index.js';

export interface HeaderLogoProps {
  logoUrl?: string | null;
  totalCount?: number;
  badge?: {
    text: string;
    variant: 'admin' | 'staff' | 'guest' | 'default';
  };
  theme?: Partial<Theme>;
  className?: string;
}

export function HeaderLogo({ logoUrl, totalCount, badge, theme, className }: HeaderLogoProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = React.useState(false);
  const showDefaultLogo = !logoUrl || logoUrl.trim() === '' || imgError;

  const defaultTheme: Theme = {
    bg: "bg-white",
    logoColor: "bg-slate-900",
    logoText: "text-slate-900 font-bold",
    button: "",
    buttonActive: "",
    badge: "bg-white border-slate-200 text-slate-600",
    badgeLabel: "text-slate-500",
    badgeVal: "text-slate-900 font-bold",
    popoverTrigger: ""
  };

  const activeTheme = { ...defaultTheme, ...theme };

  const getBadgeStyle = (variant?: 'admin' | 'staff' | 'guest' | 'default') => {
    switch (variant) {
      case 'admin':
        return "bg-indigo-600 text-white";
      case 'staff':
        return "bg-emerald-600 text-white";
      case 'guest':
        return "bg-slate-500 text-white";
      default:
        return "bg-slate-700 text-white";
    }
  };

  return (
    <div className={cn("flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap", className)}>
      {!showDefaultLogo ? (
        <div className="flex items-center gap-2 shrink-0">
          <img 
            src={logoUrl!} 
            className="h-7 sm:h-8 w-auto object-contain shrink-0 rounded-lg" 
            alt="Logo" 
            onError={() => setImgError(true)}
          />
          {badge && (
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider select-none shadow-xs shrink-0", getBadgeStyle(badge.variant))}>
              {badge.text}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 font-bold tracking-tighter shrink-0">
          <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-sm text-white shrink-0", activeTheme.logoColor)}>
            <Icon name="camera" size={16} className="stroke-[2.5]" />
          </div>
          <span className={cn("text-sm sm:text-base font-black tracking-tight shrink-0", activeTheme.logoText)}>
            {APP_CONFIG.NAME}
          </span>
          {badge && (
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider select-none shadow-xs shrink-0", getBadgeStyle(badge.variant))}>
              {badge.text}
            </span>
          )}
        </div>
      )}

      {totalCount !== undefined && (
        <div className={cn("hidden sm:flex items-center gap-1.5 text-[10px] font-medium border rounded-full px-2 py-0.5 select-none shrink-0 cursor-default justify-center shadow-sm whitespace-nowrap", activeTheme.badge)}>
          <span className={cn("uppercase tracking-wider text-[9px] shrink-0", activeTheme.badgeLabel)}>{t('totalStock')}</span>
          <span className={cn("shrink-0", activeTheme.badgeVal)}>
            {totalCount.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
