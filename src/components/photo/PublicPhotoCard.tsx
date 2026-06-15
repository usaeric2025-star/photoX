import React from 'react';
import { Photo, Category, Tag } from '@/types';
import { PhotoCardCore } from './PhotoCardCore';
import { PhotoStatusBadges } from './PhotoStatusBadges';
import { PhotoCardInfo } from './PhotoCardInfo';
import { useTranslation, useColumns } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoCardInteraction } from '@/hooks/photo/usePhotoCardInteraction';

interface PublicPhotoCardProps {
  photo: Photo;
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
    photo,
    isManagement: false,
    isMultiSelect: false,
    showGroupsCollapsed,
    hasSearchQuery,
    onClick
  });

  const categories = sharedCategories || [];
  const categoryId = photo.category_id ? String(photo.category_id) : '';
  const displayCatName = getTranslatedCategoryName(categoryId, categories, lang, t);

  return (
    <PhotoCardCore
      photo={photo}
      isSelected={isSelected}
      imgVariant={columns <= 3 ? 'md' : 'sm'}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      ref={cardRef}
    >
      <PhotoStatusBadges 
          photo={photo} 
          isPinned={!!photo.is_pinned} 
          hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
        />
        <PhotoCardInfo 
          hideDetails={hideDetails}
          displayCatName={displayCatName}
          photoTags={photo.tags}
        />
    </PhotoCardCore>
  );
};
