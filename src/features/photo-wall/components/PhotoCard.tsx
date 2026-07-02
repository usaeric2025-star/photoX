import React, { memo, useCallback } from 'react';
import { useStore } from '#lib/store/index.js';
import { photoWallStore } from '../signal.js';
import { PhotoListItem } from '#src/types/api.js';
import { AdminPhotoCard } from '#src/components/photo/AdminPhotoCard.js';
import { PublicPhotoCard } from '#src/components/photo/PublicPhotoCard.js';

interface PhotoCardProps {
  photo: PhotoListItem;
  hideGroupBadge?: boolean;
  isGroupDetail?: boolean;
  priority?: boolean;
}

export const PhotoCard = memo(function PhotoCard({ photo, hideGroupBadge, isGroupDetail, priority }: PhotoCardProps) {
  const { mode, onPhotoClick } = useStore(photoWallStore);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (onPhotoClick) {
      onPhotoClick(photo);
    }
  }, [photo, onPhotoClick]);

  if (mode === 'admin') {
    return <AdminPhotoCard photo={photo} onClick={handleClick} hideGroupBadge={hideGroupBadge} isGroupDetail={isGroupDetail} priority={priority} />;
  }

  return <PublicPhotoCard photo={photo} onClick={handleClick} hideGroupBadge={hideGroupBadge} priority={priority} />;
});


