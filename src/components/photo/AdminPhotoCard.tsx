import React, { memo } from 'react';
import { Category, Tag } from '@/types';
import { PhotoListItem } from '@/types/api';
import { PhotoCardBase } from './PhotoCardBase';
import { PhotoStatusBadges, PhotoCardInfo, PhotoSelectionIndicator } from './PhotoCardParts';
import { PinButton } from './PinButton';
import { useColumns, usePermission, usePerformance } from '@/hooks';
import { useSignal, useUI, type UIStoreState } from '@/lib/store';
import { isMultiSelect as isMultiSelectSignal, selectedIds as selectedIdsSignal } from '@/lib/store';
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
  selected?: boolean;
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
  selected,
}: AdminPhotoCardProps) {
  usePerformance('AdminPhotoCard');
  const selectedIds = useSignal(selectedIdsSignal);
  const isMultiSelect = useSignal(isMultiSelectSignal);
  const isSelected = selected !== undefined ? selected : selectedIds.includes(photo.id);
  const { columns } = useColumns();
  
  const { cardRef, handleClick, handleMouseEnter } = usePhotoCard({
    photo,
    isManagement: true,
    isMultiSelect,
    showGroupsCollapsed,
    hasSearchQuery,
    onClick
  });

  const { can } = usePermission();
  const actualCanPin = canPin !== undefined ? canPin : can('photo:toggle-pinned');

  return (
    <PhotoCardBase
      item={photo}
      isSelected={isSelected}
      isMultiSelect={isMultiSelect}
      imgVariant={columns <= 3 ? 'md' : 'sm'}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      ref={cardRef}
    >
      {isMultiSelect && (
        <PhotoSelectionIndicator isSelected={isSelected} />
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
        photoTags={photo.tags}
        photoName={photo.name}
      />
    </PhotoCardBase>
  );
});
