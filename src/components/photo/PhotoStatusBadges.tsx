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
    <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1 pointer-events-none select-none z-30">
      {/* Group Badge - More Prominent Style */}
      {shouldShowGroup && (
        <div className={cn(
          "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-sm text-[8px] sm:text-[10px] font-black flex items-center gap-1.5 border shadow-xl transition-all backdrop-blur-xl",
          "relative border-l-4",
          isDraft 
            ? "bg-slate-800/95 text-white border-white/20 border-l-slate-400" 
            : "bg-black/90 text-brand-gold border-brand-gold/50 border-l-brand-gold shadow-black/40"
        )}>
          <Layers size={10} strokeWidth={3} className={cn("shrink-0", isDraft ? "text-white/70" : "text-brand-gold")} />
          <span className="tracking-tighter uppercase">{memberCount}{isDraft ? ' (DRAFT)' : ''}</span>
        </div>
      )}

      {/* Hidden Status - Special mark for hidden photos */}
      {isManagement && photo.is_hidden && (
        <div className="bg-rose-600 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-sm text-[8px] sm:text-[9.5px] font-black flex items-center gap-1.5 shadow-lg border border-rose-500/50 uppercase tracking-tighter">
          <ShieldAlert size={10} strokeWidth={3} className="shrink-0" />
          <span>{hiddenLabel}</span>
        </div>
      )}

      {/* Cover Badge */}
      {isCover && showCoverBadge && (
        <div className="bg-brand-gold text-slate-950 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-sm flex items-center justify-center gap-1 shadow-md border border-brand-gold/50 text-[8px] sm:text-[9.5px] font-black tracking-tighter uppercase">
          <Crown size={10} fill="currentColor" strokeWidth={3} className="shrink-0" />
          <span>{coverLabel}</span>
        </div>
      )}

      {/* Pinned Status */}
      {isManagement && isPinned && (
        <div className="bg-sky-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-sm text-[8px] sm:text-[9.5px] font-black flex items-center gap-1 shadow-md border border-sky-400/30 uppercase tracking-tighter">
          <Heart size={10} fill="currentColor" strokeWidth={3} className="shrink-0" />
          <span>TOP</span>
        </div>
      )}
    </div>
  );
};

PhotoStatusBadges.displayName = 'PhotoStatusBadges';

