import React, { memo } from 'react';
import { Category, Tag } from '#src/types/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { PhotoCardBase } from './PhotoCardBase.js';
import { PhotoStatusBadges, PhotoCardInfo, PhotoSelectionIndicator } from './PhotoCardParts.js';
import { PinButton } from './PinButton.js';
import { useColumns, usePermission, usePerformance } from '#src/hooks/index.js';
import { useIsMultiSelect, useIsPhotoSelected } from '#src/hooks/index.js';
import { useSignal, useUI } from '#lib/store/index.js';
import { gridColumns as gridColumnsSignal } from '#lib/store/index.js';
import { usePhotoCard } from '#src/hooks/photo/usePhotoCard.js';

interface AdminPhotoCardProps {
  photo: PhotoListItem;
  onClick?: (e: React.MouseEvent) => void;
  hideDetails?: boolean;
  hideGroupBadge?: boolean;
  showGroupsCollapsed?: boolean;
  hasSearchQuery?: boolean;
  sharedCategories?: Category[];
  sharedTags?: Tag[];
  canPin?: boolean;
  canPinGlobal?: boolean;
  priority?: boolean;
  isGroupDetail?: boolean;
}

export const AdminPhotoCard = memo(function AdminPhotoCard({
  photo,
  onClick,
  hideDetails = false,
  hideGroupBadge = false,
  showGroupsCollapsed = true,
  hasSearchQuery = false,
  sharedCategories,
  sharedTags,
  canPin,
  canPinGlobal,
  priority = false,
  isGroupDetail = false,
}: AdminPhotoCardProps) {
  const isMultiSelect = useIsMultiSelect();
  const isPhotoSelected = useIsPhotoSelected(photo.id);
  const columns = useSignal(gridColumnsSignal) as number;
  const { can } = usePermission();
  
  const { cardRef, handleClick } = usePhotoCard({
    photo,
    isManagement: true,
    isMultiSelect,
    showGroupsCollapsed,
    hasSearchQuery,
    onClick
  });

  const actualCanPin = canPin !== undefined ? canPin : (canPinGlobal !== undefined ? canPinGlobal : can('photo:toggle-pinned'));

  const isGroupCard = showGroupsCollapsed && photo.groupId && typeof photo.memberCount === 'number' && photo.memberCount > 1;
  const isUnnamedGroup = !photo.groupName || photo.groupName === photo.groupId || photo.groupName === '[object Object]';
  const displayPhotoName = isGroupCard ? (isUnnamedGroup ? 'GROUP' : photo.groupName) : photo.name;
  const displayPhotoTags = isGroupCard ? undefined : photo.tags;
  const displayCategoryName = isGroupCard ? (photo.categoryNameZh || undefined) : undefined;

  return (
    <PhotoCardBase
      item={photo}
      isSelected={isPhotoSelected}
      isMultiSelect={isMultiSelect}
      imgVariant={columns <= 3 ? 'md' : 'sm'}
      priority={priority}
      onClick={handleClick}
      ref={cardRef}
    >
      {isMultiSelect && (
        <PhotoSelectionIndicator isSelected={isPhotoSelected} />
      )}
      <PhotoStatusBadges 
        photo={photo} 
        hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
        isGroupDetail={isGroupDetail}
      />
      {(actualCanPin && !isMultiSelect) && (
        <PinButton photoId={photo.id} isPinned={!!photo.isPinned} />
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
         prev.photo.isPinned === next.photo.isPinned &&
         prev.photo.isGroupCover === next.photo.isGroupCover &&
         prev.photo.memberCount === next.photo.memberCount &&
         prev.photo.isHidden === next.photo.isHidden &&
         prev.photo.groupName === next.photo.groupName &&
         prev.priority === next.priority &&
         prev.canPinGlobal === next.canPinGlobal &&
         prev.showGroupsCollapsed === next.showGroupsCollapsed &&
         prev.hideGroupBadge === next.hideGroupBadge &&
         prev.isGroupDetail === next.isGroupDetail &&
         prev.hasSearchQuery === next.hasSearchQuery;
});
