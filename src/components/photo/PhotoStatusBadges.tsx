import React from 'react';
import { Layers, Heart, ShieldAlert, Crown } from 'lucide-react';
import { Photo } from '@/types';
import { GalleryVariant } from '@/types/variant';
import { getDisplayGroupCode } from '@/services/photo/utils';
import { useUIStore } from '@/store/useUIStore';

interface PhotoStatusBadgesProps {
  photo: Photo;
  variant: GalleryVariant;
  isPinned: boolean;
  hideGroupBadge?: boolean;
  showCoverBadge?: boolean;
}

/**
 * [ATOMIC-COMPONENT] PhotoStatusBadges
 * Standardized status indicators for photos (Groups, Selection, Admin tags)
 */
export function PhotoStatusBadges({ 
  photo, 
  variant, 
  isPinned, 
  hideGroupBadge,
  showCoverBadge = false
}: PhotoStatusBadgesProps) {
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  const appLang = useUIStore(s => s.appLang);
  
  // Display group info logic
  const shouldShowGroup = !hideGroupBadge && photo.group_id;
  const groupCode = getDisplayGroupCode(photo.group_id);
  const memberCount = photo.group?.member_count ?? 1;

  // Hidden Status label
  const hiddenLabel = appLang === 'zh' ? '已隐藏' : appLang === 'ms' ? 'Sembunyi' : 'Hidden';
  const coverLabel = appLang === 'zh' ? '封面' : appLang === 'ms' ? 'Muka' : 'Cover';

  const isCover = photo.is_group_cover;

  return (
    <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10 pointer-events-none select-none">
      {/* Group Badge */}
      {shouldShowGroup && (
        <div className="backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] text-white font-bold flex items-center gap-1.5 border border-white/20 shadow-sm bg-blue-600/80">
          <Layers size={10} strokeWidth={2.5} />
          <span>{memberCount}</span>
        </div>
      )}

      {/* Cover Badge */}
      {isCover && showCoverBadge && (
        <div className="bg-amber-500 p-1 rounded-md text-white flex items-center justify-center shadow-sm border border-white/20">
          <Crown size={10} fill="currentColor" />
        </div>
      )}

      {/* Pinned Status */}
      {isManagement && isPinned && (
        <div className="bg-brand-gold px-1.5 py-0.5 rounded-md text-[9px] text-white font-black flex items-center gap-1 shadow-sm border border-white/20">
          <Heart size={9} fill="currentColor" />
          <span>TOP</span>
        </div>
      )}
      
      {/* Hidden Status */}
      {isManagement && photo.is_hidden && (
        <div className="bg-red-500/90 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[9px] text-white font-black flex items-center gap-1 shadow-sm border border-white/20">
          <ShieldAlert size={9} />
          <span>{hiddenLabel}</span>
        </div>
      )}
    </div>
  );
}
