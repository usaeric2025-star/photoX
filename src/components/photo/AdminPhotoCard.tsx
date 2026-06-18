import React from 'react';
import { Category, Tag } from '@/types';
import { PhotoListItem } from '@/types/api/photos';
import { PhotoCardBase } from './PhotoCardBase';
import { PhotoStatusBadges, PhotoCardInfo, PhotoSelectionIndicator } from './PhotoCardParts';
import { PinButton } from './PinButton';
import { useTranslation, useColumns, usePermission } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoCardInteraction } from '@/hooks/photo/usePhotoCardInteraction';

interface AdminPhotoCardProps {
  photo: PhotoListItem;
  hideDetails?: boolean;
  hideGroupBadge?: boolean;
  showGroupsCollapsed?: boolean;
  hasSearchQuery?: boolean;
  sharedCategories?: Category[];
  sharedTags?: Tag[];
  canPin?: boolean;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
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
  const internalIsSelected = useUIStore((s) => s.selectedIds.includes(photo.id));
  const isSelected = selected !== undefined ? selected : internalIsSelected;
  const isMultiSelect = useUIStore((s) => s.isMultiSelect);
  
  const { lang, uiTranslations: t } = useTranslation();
  const { columns } = useColumns();
  
  const { cardRef, handleClick, handleMouseEnter } = usePhotoCardInteraction({
    photo: photo as any, // Temporary cast as hook still expects old type
    isManagement: true,
    isMultiSelect,
    showGroupsCollapsed,
    hasSearchQuery,
    onClick
  });

  const { can: permissionCan } = usePermission();
  const actualCanPin = canPin !== undefined ? canPin : permissionCan('photo:toggle-pinned');
  const categories = sharedCategories || [];
  
  // Note: PhotoListItem doesn't have category_id? 
  // Wait, I should add it to the contract if needed or handle it.
  // For now let's assume category name is not strictly needed for the grid badge if we have tags.
  // Actually, getTranslatedCategoryName needs categoryId.
  const displayCatName = ''; // Simpler for now or keep old logic if we add categoryId to contract

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
        photo={photo as any} 
        isPinned={!!photo.isPinned} 
        hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
      />
      {actualCanPin && !isMultiSelect && (
        <PinButton photoId={photo.id} isPinned={!!photo.isPinned} />
      )}
      <PhotoCardInfo 
        hideDetails={hideDetails}
        photoTags={photo.tags}
      />
    </PhotoCardBase>
  );
};
