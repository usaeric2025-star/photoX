import React from 'react';
import { Photo, Category, Tag } from '@/types';
import { PhotoCardCore } from './PhotoCardCore';
import { PhotoStatusBadges } from './PhotoStatusBadges';
import { PhotoCardInfo } from './PhotoCardInfo';
import { PinButton } from './PinButton';
import { PhotoSelectionIndicator } from './PhotoSelectionIndicator';
import { useTranslation, useColumns, usePermission } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoCardInteraction } from '@/hooks/photo/usePhotoCardInteraction';

interface AdminPhotoCardProps {
  photo: Photo;
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
    photo,
    isManagement: true,
    isMultiSelect,
    showGroupsCollapsed,
    hasSearchQuery,
    onClick
  });

  const { can: permissionCan } = usePermission();
  const actualCanPin = canPin !== undefined ? canPin : permissionCan('photo:toggle-pinned');
  const categories = sharedCategories || [];
  const categoryId = photo.category_id ? String(photo.category_id) : '';
  const displayCatName = getTranslatedCategoryName(categoryId, categories, lang, t);

  return (
    <PhotoCardCore
      photo={photo}
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
        isPinned={!!photo.is_pinned} 
        hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
      />
      {actualCanPin && (
        <PinButton photoId={photo.id} isPinned={!!photo.is_pinned} />
      )}
      <PhotoCardInfo 
        hideDetails={hideDetails}
        displayCatName={displayCatName}
        photoTags={photo.tags}
      />
    </PhotoCardCore>
  );
};
