import React from 'react';
import { Category, Tag } from '@/types';
import { PhotoListItem } from '@/types/api';
import { PhotoCardBase } from './PhotoCardBase';
import { PhotoStatusBadges, PhotoCardInfo } from './PhotoCardParts';
import { useColumns } from '@/hooks';
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
  const { columns } = useColumns();
  
  const { cardRef, handleClick, handleMouseEnter } = usePhotoCardInteraction({
    photo,
    isManagement: false,
    isMultiSelect: false,
    showGroupsCollapsed,
    hasSearchQuery,
    onClick
  });

  return (
    <PhotoCardBase
      item={photo}
      isSelected={false}
      isMultiSelect={false}
      imgVariant={columns <= 3 ? 'md' : 'sm'}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      ref={cardRef}
    >
      <PhotoStatusBadges 
        photo={photo} 
        isPinned={!!photo.isPinned} 
        hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
      />
      <PhotoCardInfo 
        hideDetails={hideDetails}
        photoTags={photo.tags}
        photoName={photo.name}
      />
    </PhotoCardBase>
  );
};
