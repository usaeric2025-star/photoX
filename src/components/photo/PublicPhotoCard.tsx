import React from 'react';
import { Category, Tag } from '@/types';
import { PhotoListItem } from '@/types/api/photos';
import { PhotoCardBase } from './PhotoCardBase';
import { PhotoStatusBadges, PhotoCardInfo } from './PhotoCardParts';
import { useTranslation, useColumns } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoCardInteraction } from '@/hooks/photo/usePhotoCardInteraction';

interface PublicPhotoCardProps {
  photo: PhotoListItem;
  onClick?: (e: React.MouseEvent) => void;
  hideDetails?: boolean;
  hideGroupBadge?: boolean;
  showGroupsCollapsed?: boolean;
  hasSearchQuery?: boolean;
  sharedCategories?: Category[];
  sharedTags?: Tag[];
}

export const PublicPhotoCard = ({
  photo,
  onClick,
  hideDetails = false,
  hideGroupBadge = false,
  showGroupsCollapsed = true,
  hasSearchQuery = false,
  sharedCategories,
  sharedTags,
}: PublicPhotoCardProps) => {
  const isSelected = useUIStore((s) => s.selectedIds.includes(photo.id));
  const { lang, uiTranslations: t } = useTranslation();
  const { columns } = useColumns();
  
  const { cardRef, handleClick, handleMouseEnter } = usePhotoCardInteraction({
    photo: photo as any,
    isManagement: false,
    isMultiSelect: false,
    showGroupsCollapsed,
    hasSearchQuery,
    onClick
  });

  const categories = sharedCategories || [];
  const displayCatName = ''; // Handled by tags for now or add to contract

  return (
    <PhotoCardBase
      item={photo}
      isSelected={isSelected}
      imgVariant={columns <= 3 ? 'md' : 'sm'}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      ref={cardRef}
    >
      <PhotoStatusBadges 
          photo={photo as any} 
          isPinned={!!photo.isPinned} 
          hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
        />
        <PhotoCardInfo 
          hideDetails={hideDetails}
          photoTags={photo.tags}
        />
    </PhotoCardBase>
  );
};
