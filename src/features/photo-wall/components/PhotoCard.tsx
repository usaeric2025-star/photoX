import React, { memo, useCallback } from 'react';
import { useAtomValue } from "jotai";
import { photoWallModeAtom, onPhotoClickAtom } from '../signal.js';
import { PhotoListItem } from '#src/types/api.js';
import { AdminPhotoCard } from '#src/components/photo/AdminPhotoCard.js';
import { PublicPhotoCard } from '#src/components/photo/PublicPhotoCard.js';

interface PhotoCardProps {
  photo: PhotoListItem;
  hideGroupBadge?: boolean;
  isGroupDetail?: boolean;
  priority?: boolean;
  lang?: string;
}

export const PhotoCard = memo(function PhotoCard({ photo, hideGroupBadge, isGroupDetail, priority, lang }: PhotoCardProps) {
  const mode = useAtomValue(photoWallModeAtom);
  const { fn: onPhotoClick } = useAtomValue(onPhotoClickAtom) as any;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (onPhotoClick) {
      onPhotoClick(photo);
    }
  }, [photo, onPhotoClick]);

  if (mode === 'admin') {
    return (
      <AdminPhotoCard 
        photo={photo} 
        onClick={handleClick} 
        hideGroupBadge={hideGroupBadge} 
        isGroupDetail={isGroupDetail} 
        showGroupsCollapsed={!isGroupDetail}
        priority={priority} 
        lang={lang}
      />
    );
  }

  return (
    <PublicPhotoCard 
      photo={photo} 
      onClick={handleClick} 
      hideGroupBadge={hideGroupBadge} 
      showGroupsCollapsed={!isGroupDetail}
      priority={priority} 
      lang={lang}
    />
  );
});


