import React, { useRef, useMemo } from 'react';
import { Photo, Category, Tag } from '@/types';
import { GalleryVariant } from '@/types/variant';
import { VirtualPhotoGrid } from './VirtualPhotoGrid';
import { PhotoCard } from './PhotoCard';
import { usePhotoInfiniteList, useFilters, useUrlFilters } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { PAGINATION } from '@/constants/config';
import { normalizeAdminPhotos } from '@/lib/selectors/photos';

interface PhotoListContainerProps {
  variant: GalleryVariant;
  filters: any; // Using any for now based on imported types
  isAdminMode: boolean;
  categories: Category[];
  tags: Tag[];
}

export function PhotoListContainer({ variant, filters, isAdminMode, categories, tags }: PhotoListContainerProps) {
  const { filters: urlFilters } = useUrlFilters();
  const store = useUIStore(s => ({
    columns: s.columns
  }));

  const infiniteQuery = usePhotoInfiniteList({
    category_id: filters.categoryId,
    tag_id: Array.isArray(filters.tagIds) && filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: urlFilters.sortOrder,
    isAdminMode: isAdminMode
  }, PAGINATION.ADMIN_BATCH_SIZE, true);

  const rawPhotos = infiniteQuery.data?.pages?.flatMap(p => p.photos) ?? [];

  const photos = normalizeAdminPhotos(rawPhotos);

  return (
    <VirtualPhotoGrid
      photos={photos}
      isFetching={infiniteQuery.isLoading}
      isFetchingNextPage={infiniteQuery.isFetchingNextPage}
      hasNextPage={!!infiniteQuery.hasNextPage}
      onLoadMore={infiniteQuery.fetchNextPage}
      columns={store.columns}
      renderCard={(photo, index) => (
        // This part needs to be passed in correctly or defined here.
        // Assuming PhotoListContainer or its parent will handle card rendering.
        null 
      )}
    />
  );
}
