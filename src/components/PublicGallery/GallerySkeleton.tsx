import React from 'react';
import { PhotoCardSkeleton } from '../ui/Skeleton';

interface GallerySkeletonProps {
  columns: 2 | 3 | 5;
}

export const GallerySkeleton: React.FC<GallerySkeletonProps> = ({ columns }) => {
  return (
    <div className={`grid gap-3 p-2 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
      {Array.from({ length: 15 }).map((_, i) => (
        <PhotoCardSkeleton key={i} />
      ))}
    </div>
  );
};
