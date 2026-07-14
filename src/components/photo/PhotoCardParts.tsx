import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { PhotoListItem } from '#src/types/api.js';
import { cn } from '#lib/utils.js';
import { useTranslation, useIsManagement, usePermission } from '#src/hooks/index.js';
import { getDisplayGroupCode } from '#src/utils/photo.js';

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
  const hiddenLabel = t('hidden');
  const coverLabel = t('cover');

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
  if (hideDetails) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
      <div className="flex flex-col gap-1">
        {categoryName && (
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest line-clamp-1">
            {categoryName}
          </span>
        )}
        {photoName && (
          <h3 className="text-sm font-bold text-white line-clamp-1 leading-tight tracking-tight">
            {photoName}
          </h3>
        )}
        {photoTags && photoTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {photoTags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-[9px] bg-white/20 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Renders selection checkmark
 */
export const PhotoSelectionIndicator = ({ isSelected }: { isSelected: boolean }) => (
  <div className={cn(
    "absolute top-2 right-2 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center shadow-lg",
    isSelected 
      ? "bg-primary border-primary scale-110" 
      : "bg-white/80 border-white/50 scale-100"
  )}>
    {isSelected ? (
      <Icon name="check" size={14} className="text-white stroke-[3]" />
    ) : (
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
    )}
  </div>
);
