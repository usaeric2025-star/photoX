import React, { useRef, useMemo } from 'react';
import { Photo, Category, Tag } from '@/types';
import { GalleryVariant } from '@/types/variant';
import { VirtualPhotoGrid } from './VirtualPhotoGrid';
import { PhotoCard } from './PhotoCard';
import { usePhotos, useUrlFilters } from '@/hooks';
import { useUIStore, useColumns } from '@/store/useUIStore';
import { PAGINATION } from '@/constants/config';
import { normalizeAdminPhotos } from '@/lib/selectors/photos';

interface PhotoListContainerProps {
  variant: GalleryVariant;
  filters: any; // Using any for now based on imported types
  isAdminMode: boolean;
  categories: Category[];
  tags: Tag[];
}

export function PhotoListContainer({ variant, isAdminMode, categories, tags }: Omit<PhotoListContainerProps, 'filters'>) {
  const { filters: urlFilters } = useUrlFilters();
  const [columns] = useColumns();

  const infiniteQuery = usePhotos({
    category_id: urlFilters.categoryId,
    tag_id: urlFilters.tagId,
    searchQuery: urlFilters.searchQuery,
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
      columns={columns}
      renderCard={(photo, index) => (
        // This part needs to be passed in correctly or defined here.
        // Assuming PhotoListContainer or its parent will handle card rendering.
        null 
      )}
    />
  );
}
