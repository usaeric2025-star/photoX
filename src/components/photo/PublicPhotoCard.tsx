import React, { memo } from 'react';
import { Category, Tag } from '#src/types/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { PhotoCardBase } from './PhotoCardBase.js';
import { PhotoStatusBadges, PhotoCardInfo } from './PhotoCardParts.js';
import { usePerformance } from '#src/hooks/index.js';
import { usePhotoCard } from '#src/hooks/photo/usePhotoCard.js';
import { useGrid } from '#src/context/GridContext.js';
import { Icon } from '#src/components/ui/Icon.js';

interface PublicPhotoCardProps {
  photo: PhotoListItem;
  onClick?: (e: React.MouseEvent) => void;
  hideDetails?: boolean;
  hideGroupBadge?: boolean;
  showGroupsCollapsed?: boolean;
  hasSearchQuery?: boolean;
  sharedCategories?: Category[];
  sharedTags?: Tag[];
  priority?: boolean;
}

export const PublicPhotoCard = memo(function PublicPhotoCard({
  photo,
  onClick,
  hideDetails = false,
  hideGroupBadge = false,
  showGroupsCollapsed = true,
  hasSearchQuery = false,
  sharedCategories,
  sharedTags,
  priority = false,
}: PublicPhotoCardProps) {
  const { columns } = useGrid();
  
  const { cardRef, handleClick, longPressHandlers } = usePhotoCard({
    photo,
    isManagement: false,
    isMultiSelect: false,
    showGroupsCollapsed,
    hasSearchQuery,
    onClick
  });

  const isGroupCard = showGroupsCollapsed && photo.groupId && typeof photo.memberCount === 'number' && photo.memberCount > 1;
  const isUnnamedGroup = !photo.groupName || photo.groupName === photo.groupId || photo.groupName === '[object Object]';
  const displayPhotoName = isGroupCard ? (isUnnamedGroup ? 'GROUP' : photo.groupName) : photo.name;
  const displayPhotoTags = isGroupCard ? undefined : photo.tags;
  const displayCategoryName = isGroupCard ? (photo.categoryNameZh || undefined) : undefined;

  return (
    <PhotoCardBase
      item={photo}
      isSelected={false}
      isMultiSelect={false}
      imgVariant={columns <= 4 ? 'md' : 'sm'}
      priority={priority}
      onClick={handleClick}
      ref={cardRef}
      onMouseDown={longPressHandlers.onMouseDown}
      onMouseMove={longPressHandlers.onMouseMove}
      onMouseUp={longPressHandlers.onMouseUp}
      onMouseLeave={longPressHandlers.onMouseLeave}
      onTouchStart={longPressHandlers.onTouchStart}
      onTouchMove={longPressHandlers.onTouchMove}
      onTouchEnd={longPressHandlers.onTouchEnd}
      onTouchCancel={longPressHandlers.onTouchCancel}
    >
      <PhotoStatusBadges 
        photo={photo} 
        hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
      />
      {photo.isPinned && (
        <div className="absolute top-2 right-2 p-1.5 sm:p-2 rounded-full border border-white/20 bg-black/80 text-white shadow-lg pointer-events-none select-none">
          <Icon name="heart" size={14} className="fill-current text-red-500" />
        </div>
      )}
      <PhotoCardInfo 
        hideDetails={hideDetails}
        photoTags={displayPhotoTags}
        photoName={displayPhotoName}
        categoryName={displayCategoryName}
      />
    </PhotoCardBase>
  );
}, (prev, next) => {
  return prev.photo.id === next.photo.id && 
         prev.photo.name === next.photo.name &&
         prev.photo.imageUrl === next.photo.imageUrl &&
         prev.photo.imageHash === next.photo.imageHash &&
         prev.photo.createdAt === next.photo.createdAt &&
         prev.photo.isPinned === next.photo.isPinned &&
         prev.priority === next.priority &&
         prev.showGroupsCollapsed === next.showGroupsCollapsed &&
         prev.hideGroupBadge === next.hideGroupBadge &&
         prev.hasSearchQuery === next.hasSearchQuery;
});
