import React from 'react';
import { usePhotoGrid } from '@/hooks/photo/usePhotoGrid';
import { PhotoGridContent } from './PhotoGridContent';
import { logger } from '@/lib/logger';

import type { PhotoListItem } from '@/types/api';

interface PublicPhotoGridProps {
  photos: PhotoListItem[];
  dataVersion: string;
  isPending: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  columns: number;
  filters: Record<string, unknown>;
  gridRef?: React.Ref<any>;
  onScroll?: (offset: number) => void;
  onPhotoClick?: (id: string, index: number, e?: React.MouseEvent) => void;
}

export function PublicPhotoGrid({ 
  photos, 
  dataVersion, 
  isPending, 
  isFetching, 
  isFetchingNextPage, 
  hasNextPage, 
  fetchNextPage, 
  filters,
  gridRef,
  onScroll,
  onPhotoClick,
  columns
}: PublicPhotoGridProps) {
  
  logger.debug('[PublicPhotoGrid] Render Start', { photosCount: photos?.length, isPending, isFetching, dataVersion });

  return (
    <div className="h-full w-full relative">
      <PhotoGridContent 
        photos={photos || []}
        dataVersion={dataVersion}
        isPending={isPending}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        columns={columns}
        mode="public"
        filters={filters}
        gridRef={gridRef}
        onScroll={onScroll}
        onPhotoClick={onPhotoClick}
      />
    </div>
  );
}
