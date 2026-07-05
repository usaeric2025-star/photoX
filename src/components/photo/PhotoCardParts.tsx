import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { PhotoListItem } from '#src/types/api.js';
import { cn } from '#lib/utils.js';
import { useTranslation, useIsManagement } from '#src/hooks/index.js';
import { getDisplayGroupCode } from '#src/services/photo/utils.js';

/**
 * Renders badges for photo status (pinned, hidden, group info)
 */
export const PhotoStatusBadges = ({
  photo,
  hideGroupBadge,
  isGroupDetail = false,
}: {
  photo: PhotoListItem;
  hideGroupBadge?: boolean;
  isGroupDetail?: boolean;
}) => {
  const { t } = useTranslation();
  const isManagement = useIsManagement();
  
  const shouldShowGroup = !hideGroupBadge && photo.groupId;
  const hiddenLabel = t('hidden') || '已隐藏';
  const coverLabel = t('cover') || '封面';

  return (
    <div className="absolute top-2 left-2 flex flex-col items-start gap-1 pointer-events-none select-none">

      {/* Group Cover Badge */}
      {isManagement && photo.isGroupCover && isGroupDetail && (
        <div className="badge-cover">
          <Icon name="image" size={11} className="shrink-0" />
          <span>{coverLabel}</span>
        </div>
      )}

      {/* Group Badge - Apple Style: pill, solid surface */}
      {shouldShowGroup && typeof photo.memberCount === 'number' && photo.memberCount > 1 && (
        <div className="badge-group">
          <Icon name="layers" size={11} className="shrink-0 text-primary" />
          <span className="leading-none tabular-nums mt-[0.5px] px-0.5">
            {photo.memberCount}
          </span>
        </div>
      )}

      {/* Hidden Status - Apple Style */}
      {isManagement && photo.isHidden && (
        <div className="badge-hidden">
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
  photoName,
  categoryName
}: { 
  hideDetails?: boolean; 
  photoTags?: string[];
  photoName?: string;
  categoryName?: string;
}) => {
  // REMOVED group-hover to improve PC grid scrolling performance
  if (hideDetails) return null;

  return null; 
};

/**
 * Renders selection checkmark
 */
export const PhotoSelectionIndicator = ({ isSelected }: { isSelected: boolean }) => (
  <div className={cn(
    "absolute top-2 right-2 w-6 h-6 rounded-full border-2 transition-none flex items-center justify-center shadow-sm",
    isSelected 
      ? "bg-primary border-primary scale-110 shadow-md" 
      : "hidden"
  )}>
    {isSelected && <Icon name="check" size={14} className="text-white" />}
  </div>
);
