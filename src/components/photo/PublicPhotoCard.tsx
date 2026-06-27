import React, { memo } from 'react';
import { Category, Tag } from '@/types';
import { PhotoListItem } from '@/types/api';
import { PhotoCardBase } from './PhotoCardBase';
import { PhotoStatusBadges, PhotoCardInfo } from './PhotoCardParts';
import { useColumns, usePerformance } from '@/hooks';
import { usePhotoCard } from '@/hooks/photo/usePhotoCard';
import { useSignal, gridColumns as gridColumnsSignal } from '@/lib/store';

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

export const PublicPhotoCard = memo(function PublicPhotoCard({
  photo,
  onClick,
  hideDetails = false,
  hideGroupBadge = false,
  showGroupsCollapsed = true,
  hasSearchQuery = false,
  sharedCategories,
  sharedTags,
}: PublicPhotoCardProps) {
  const columns = useSignal(gridColumnsSignal);
  
  const { cardRef, handleClick, handleMouseEnter } = usePhotoCard({
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
}, (prev, next) => {
  return prev.photo.id === next.photo.id && 
         prev.photo.name === next.photo.name &&
         prev.photo.imageUrl === next.photo.imageUrl &&
         prev.photo.createdAt === next.photo.createdAt &&
         prev.showGroupsCollapsed === next.showGroupsCollapsed &&
         prev.hasSearchQuery === next.hasSearchQuery;
});
