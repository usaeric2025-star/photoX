import React from 'react';
import { Layers, ShieldAlert, Check } from '@/components/ui/Icon';
import { PhotoListItem } from '@/types/api';
import { cn } from '@/lib/utils';
import { useTranslation, useIsManagement } from '@/hooks';
import { getDisplayGroupCode } from '@/services/photo/utils';

/**
 * Renders badges for photo status (pinned, hidden, group info)
 */
export const PhotoStatusBadges = ({
  photo,
  isPinned,
  hideGroupBadge,
}: {
  photo: PhotoListItem;
  isPinned: boolean;
  hideGroupBadge?: boolean;
}) => {
  const { lang } = useTranslation();
  const isManagement = useIsManagement();
  
  const shouldShowGroup = !hideGroupBadge && photo.groupId;
  const groupCode = getDisplayGroupCode(photo.groupId);
  const hiddenLabel = lang === 'zh' ? '已隐藏' : lang === 'ms' ? 'Sembunyi' : 'Hidden';

  return (
    <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1 pointer-events-none select-none">
      {/* Group Badge - Optimized: only show count, remove UUID-like code as per user request */}
      {shouldShowGroup && (
        <div className={cn(
          "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-sm text-[8px] sm:text-[9px] font-black flex items-center gap-1 shadow-lg border backdrop-blur-md transition-all duration-300",
          "bg-white/90 text-brand-navy border-white/20"
        )}>
          <Layers size={10} strokeWidth={3} className="shrink-0 text-brand-gold" />
          <span className="tracking-tighter uppercase">
            {typeof photo.memberCount === 'number' && `${photo.memberCount}`}
          </span>
        </div>
      )}

      {/* Hidden Status */}
      {isManagement && photo.isHidden && (
        <div className="bg-rose-600 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-sm text-[8px] sm:text-[9.5px] font-black flex items-center gap-1.5 shadow-lg border border-rose-500/50 uppercase tracking-tighter">
          <ShieldAlert size={10} strokeWidth={3} className="shrink-0" />
          <span>{hiddenLabel}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Renders photo name and tags
 */
export const PhotoCardInfo = ({ 
  hideDetails, 
  photoTags,
  photoName
}: { 
  hideDetails?: boolean; 
  photoTags?: string[];
  photoName?: string;
}) => {
  if (hideDetails) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
      <h4 className="text-white font-bold text-xs truncate mb-1">{photoName}</h4>
      {photoTags && photoTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {photoTags.map(tag => (
            <span 
              key={tag} 
              className="shrink-0 text-[8px] sm:text-[9px] bg-white/20 backdrop-blur-md text-white px-1.5 py-0.5 rounded-sm font-bold tracking-tight uppercase border border-white/20"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Renders selection checkmark
 */
export const PhotoSelectionIndicator = ({ isSelected }: { isSelected: boolean }) => (
  <div className={cn(
    "absolute top-2 right-2 w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center",
    isSelected 
      ? "bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-500/50" 
      : "bg-black/20 border-white/50 opacity-0 group-hover:opacity-100"
  )}>
    {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
  </div>
);
