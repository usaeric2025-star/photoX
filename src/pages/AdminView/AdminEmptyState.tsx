import React from 'react';
import { GalleryEmpty } from '../../components/shared/GalleryEmpty';

interface AdminEmptyStateProps {
  t: any;
}

export function AdminEmptyState({ t }: AdminEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
      <GalleryEmpty t={t} />
    </div>
  );
};
