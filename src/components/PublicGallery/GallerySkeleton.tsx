import React from 'react';
import { PhotoCardSkeleton } from '../ui/Skeleton';

interface GallerySkeletonProps {
  columns: 2 | 3 | 5;
  count?: number;
}

export const GallerySkeleton: React.FC<GallerySkeletonProps> = ({ columns, count = 15 }) => {
  return (
    <div className={`grid gap-3 p-2 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <PhotoCardSkeleton key={`skeleton-${i}`} />
      ))}
    </div>
  );
};
