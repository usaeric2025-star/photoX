import React from 'react';
import { Layers, Heart, ShieldAlert, Crown } from 'lucide-react';
import { Photo } from '@/types';
import { getDisplayGroupCode } from '@/services/photo/utils';
import { useTranslation, useIsManagement } from '@/hooks';

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

  return (
    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10 pointer-events-none select-none">
      {/* Group Badge */}
      {shouldShowGroup && (
        <div className="backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-slate-700 font-bold flex items-center gap-1.5 bg-white/90 border border-black/5 shadow-sm">
          <Layers size={10} strokeWidth={2.5} className="opacity-70" />
          <span>{memberCount}</span>
        </div>
      )}

      {/* Cover Badge */}
      {isCover && showCoverBadge && (
        <div className="bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full flex items-center justify-center shadow-sm border border-black/5">
          <Crown size={10} fill="currentColor" />
        </div>
      )}

      {/* Pinned Status */}
      {isManagement && isPinned && (
        <div className="bg-brand-gold px-1.5 py-0.5 rounded-full text-[9px] text-white font-black flex items-center gap-1.5 shadow-sm">
          <Heart size={9} fill="currentColor" />
          <span className="tracking-widest pr-0.5">TOP</span>
        </div>
      )}
      
      {/* Hidden Status */}
      {isManagement && photo.is_hidden && (
        <div className="bg-rose-500/90 backdrop-blur-md px-1.5 py-0.5 rounded-full text-[9px] text-white font-black flex items-center gap-1.5 shadow-sm border border-white/20">
          <ShieldAlert size={9} />
          <span className="tracking-widest pr-0.5">{hiddenLabel}</span>
        </div>
      )}
    </div>
  );
};

PhotoStatusBadges.displayName = 'PhotoStatusBadges';
