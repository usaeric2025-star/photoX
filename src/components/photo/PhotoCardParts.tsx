import React from 'react';
import { Icon } from '@/components/ui/Icon';
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
  const hiddenLabel = lang === 'zh' ? '已隐藏' : lang === 'ms' ? 'Sembunyi' : 'Hidden';

  return (
    <div className="absolute top-2 left-2 flex flex-col items-start gap-1 pointer-events-none select-none">
      {/* Group Badge - Apple Style: pill, backdrop-blur */}
      {shouldShowGroup && typeof photo.memberCount === 'number' && photo.memberCount > 1 && (
        <div className={cn(
          "px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-xl transition-all duration-300 min-w-[36px] justify-center",
          "bg-surface-overlay text-text-main border border-white/40"
        )}>
          <Icon name="layers" size={11} className="shrink-0 text-primary" />
          <span className="leading-none tabular-nums mt-[0.5px] px-0.5">
            {photo.memberCount}
          </span>
        </div>
      )}

      {/* Hidden Status - Apple Style */}
      {isManagement && photo.isHidden && (
        <div className="bg-danger/95 backdrop-blur-md text-text-on-primary px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm border border-white/20 uppercase tracking-tight">
          <Icon name="shield-alert" size={12} className="shrink-0" />
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
    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
      <h4 className="text-white font-semibold text-sm sm:text-base truncate mb-0.5">{photoName}</h4>
      {photoTags && photoTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {photoTags.map(tag => (
            <span 
              key={tag} 
              className="shrink-0 text-[10px] sm:text-[11px] bg-white/20 backdrop-blur-lg text-white px-2 py-0.5 rounded-full font-medium tracking-tight border border-white/10"
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
    "absolute top-2 right-2 w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center shadow-sm",
    isSelected 
      ? "bg-primary border-primary scale-110 shadow-md" 
      : "bg-black/10 border-white/40 opacity-0 group-hover:opacity-100"
  )}>
    {isSelected && <Icon name="check" size={14} className="text-white" />}
  </div>
);
