import React, { memo } from 'react';
import { Category, Tag } from '@/types';
import { PhotoListItem } from '@/types/api';
import { PhotoCardBase } from './PhotoCardBase';
import { PhotoStatusBadges, PhotoCardInfo, PhotoSelectionIndicator } from './PhotoCardParts';
import { PinButton } from './PinButton';
import { useColumns, usePermission, usePerformance } from '@/hooks';
import { useIsMultiSelect, useIsPhotoSelected } from '@/features/selection';
import { useSignal, useUI } from '@/lib/store';
import { gridColumns as gridColumnsSignal } from '@/lib/store';
import { usePhotoCard } from '@/hooks/photo/usePhotoCard';

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
  const displayPhotoName = isGroupCard ? (photo.groupName || 'GROUP') : photo.name;
  const displayPhotoTags = isGroupCard ? undefined : photo.tags;
  const displayCategoryName = isGroupCard ? (photo.categoryNameZh || undefined) : undefined;

  return (
    <PhotoCardBase
      item={photo}
      isSelected={isPhotoSelected}
      isMultiSelect={isMultiSelect}
      imgVariant={columns <= 3 ? 'md' : 'sm'}
      onClick={handleClick}
      ref={cardRef}
    >
      {isMultiSelect && (
        <PhotoSelectionIndicator isSelected={isPhotoSelected} />
      )}
      <PhotoStatusBadges 
        photo={photo} 
        isPinned={!!photo.isPinned} 
        hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
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
         prev.photo.createdAt === next.photo.createdAt &&
         prev.canPinGlobal === next.canPinGlobal &&
         prev.showGroupsCollapsed === next.showGroupsCollapsed &&
         prev.hasSearchQuery === next.hasSearchQuery;
});
