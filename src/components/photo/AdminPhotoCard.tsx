import React from 'react';
import { Category, Tag } from '@/types';
import { PhotoListItem } from '@/types/api';
import { PhotoCardBase } from './PhotoCardBase';
import { PhotoStatusBadges, PhotoCardInfo, PhotoSelectionIndicator } from './PhotoCardParts';
import { PinButton } from './PinButton';
import { useColumns, usePermission } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoCardInteraction } from '@/hooks/photo/usePhotoCardInteraction';

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

export const AdminPhotoCard = ({
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
}: AdminPhotoCardProps) => {
  const isSelected = selected !== undefined ? selected : useUIStore((s) => s.selectedIds.includes(photo.id));
  const isMultiSelect = useUIStore((s) => s.isMultiSelect);
  const { columns } = useColumns();
  
  const { cardRef, handleClick, handleMouseEnter } = usePhotoCardInteraction({
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
};
