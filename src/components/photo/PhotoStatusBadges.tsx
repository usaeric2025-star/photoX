import React from 'react';
import { Layers, Heart, ShieldAlert, Crown } from 'lucide-react';
import { Photo } from '@/types';
import { getDisplayGroupCode } from '@/services/photo/utils';
import { useTranslation, useIsManagement } from '@/hooks';
import { cn } from '@/lib/utils';

interface PhotoStatusBadgesProps {
  photo: Photo;
  isPinned: boolean;
  hideGroupBadge?: boolean;
  showCoverBadge?: boolean;
}

/**
 * [ATOMIC-COMPONENT] PhotoStatusBadges
 * Standardized status indicators for photos (Groups, Selection, Admin tags)
 */
export const PhotoStatusBadges = ({ 
  photo, 
  isPinned, 
  hideGroupBadge,
  showCoverBadge = false
}: PhotoStatusBadgesProps) => {
  const isManagement = useIsManagement();
  const { lang, uiTranslations: t } = useTranslation();
  const appLang = lang;
  
  // Display group info logic
  const shouldShowGroup = !hideGroupBadge && photo.group_id;
  const groupCode = getDisplayGroupCode(photo.group_id);
  const memberCount = photo.group?.member_count ?? 1;

  // Hidden Status label
  const hiddenLabel = appLang === 'zh' ? '已隐藏' : appLang === 'ms' ? 'Sembunyi' : 'Hidden';
  const coverLabel = appLang === 'zh' ? '封面' : appLang === 'ms' ? 'Muka' : 'Cover';

  const isCover = photo.is_group_cover;
  const isDraft = photo.group?.status === 'draft';

  return (
    <div className="absolute top-2 left-2 flex flex-wrap gap-1 pointer-events-none select-none">
      {/* Group Badge */}
      {shouldShowGroup && (
        <div className={cn(
          "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9.5px] font-bold flex items-center gap-1 border shadow-md transition-all backdrop-blur-md",
          isDraft 
            ? "bg-slate-700/80 text-white border-white/20" 
            : "bg-slate-900/90 text-brand-gold border-brand-gold/35 shadow-black/15"
        )}>
          <Layers size={10} strokeWidth={2.5} className={cn("shrink-0", isDraft ? "text-white/70" : "text-brand-gold opacity-95")} />
          <span className="tracking-wider">{memberCount}{isDraft ? ' (DRAFT)' : ''}</span>
        </div>
      )}

      {/* Cover Badge */}
      {isCover && showCoverBadge && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center justify-center gap-1 shadow-md border border-amber-300/30 text-[8px] sm:text-[9.5px] font-black tracking-wider uppercase">
          <Crown size={9} fill="currentColor" className="stroke-[2.5] shrink-0" />
          <span>{coverLabel}</span>
        </div>
      )}

      {/* Pinned Status */}
      {isManagement && isPinned && (
        <div className="bg-red-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9.5px] font-black flex items-center gap-1 shadow-md border border-red-400/20">
          <Heart size={9} fill="currentColor" className="stroke-none shrink-0" />
          <span className="tracking-wider">TOP</span>
        </div>
      )}
      
      {/* Hidden Status */}
      {isManagement && photo.is_hidden && (
        <div className="bg-rose-600/90 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9.5px] text-white font-black flex items-center gap-1 shadow-md border border-white/10">
          <ShieldAlert size={9} className="stroke-[2.5] shrink-0" />
          <span className="tracking-wider">{hiddenLabel}</span>
        </div>
      )}
    </div>
  );
};

PhotoStatusBadges.displayName = 'PhotoStatusBadges';

