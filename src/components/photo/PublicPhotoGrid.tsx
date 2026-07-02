import React from 'react';
import { PhotoGridContent } from './PhotoGridContent.js';
import { logger } from '#lib/logger.js';
import { PublicPhotoCard } from './PublicPhotoCard.js';

import type { PhotoListItem } from '#src/types/api.js';

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
  error?: unknown;
  onRetry?: () => void;
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
  columns,
  error,
  onRetry
}: PublicPhotoGridProps) {
  
  logger.debug('[PublicPhotoGrid] Render Start', { photosCount: photos?.length, isPending, isFetching, dataVersion });

  const showGroupsCollapsed = filters?.showGroupsCollapsed !== false;
  const hasSearchQuery = !!filters?.search;

  const renderItem = React.useCallback((photo: PhotoListItem, index: number) => {
    return (
      <div className="w-full h-full p-[1px]">
        <PublicPhotoCard 
          photo={photo} 
          onClick={(e: any) => onPhotoClick?.(photo.id, index, e)} 
          showGroupsCollapsed={showGroupsCollapsed}
          hasSearchQuery={hasSearchQuery}
          priority={index < 12}
        />
      </div>
    );
  }, [onPhotoClick, showGroupsCollapsed, hasSearchQuery]);


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
        gridRef={gridRef}
        onScroll={onScroll}
        error={error}
        onRetry={onRetry}
        renderItem={renderItem}
      />
    </div>
  );
}
