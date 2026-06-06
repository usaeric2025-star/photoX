import React, { useRef } from 'react';
import { Photo, Category, Tag, TranslationType } from '@/types';
import { GalleryVariant } from '@/types/variant';
import { VirtualPhotoGrid } from './VirtualPhotoGrid';
import { PhotoCard } from './PhotoCard';
import { usePhotos, useUrlFilters } from '@/hooks';
import { useUIStore, useColumns } from '@/store/useUIStore';
import { PAGINATION } from '@/constants/config';
import { normalizeAdminPhotos } from '@/lib/selectors/photos';
import { getTranslatedCategoryName } from '@/lib/ui-helpers';
import { translations } from '@/lib/translations';

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
  const appLang = useUIStore((s) => s.appLang);
  const t = (translations[appLang as keyof typeof translations] || translations.en) as TranslationType;
  
  // Pre-compute tag map for optimized lookup
  const tagMap = new Map(tags.map(tag => [String(tag.id), tag.name]));

  const filterParams = React.useMemo(() => ({
    category_id: urlFilters.categoryId,
    tag_id: urlFilters.tagId,
    searchQuery: urlFilters.searchQuery,
    sortOrder: urlFilters.sortOrder,
    isAdminMode: isAdminMode
  }), [urlFilters.categoryId, urlFilters.tagId, urlFilters.searchQuery, urlFilters.sortOrder, isAdminMode]);

  const infiniteQuery = usePhotos(filterParams, PAGINATION.ADMIN_BATCH_SIZE, true);

  const rawPhotos = infiniteQuery.data?.pages?.flatMap(p => p.photos) ?? [];

  const photos = normalizeAdminPhotos(rawPhotos);

  const renderCard = (photo: Photo, index: number) => {
    // Optimization: Calculate these here, not inside PhotoCard, to avoid
    // hook overhead per card on every render.
    const categoryId = photo.category_id ? String(photo.category_id) : '';
    const displayCatName = getTranslatedCategoryName(categoryId, categories, appLang, t);
    
    const photoTags = (Array.isArray(photo.tag_ids) ? photo.tag_ids : [])
        .map(id => tagMap.get(String(id)) ?? '')
        .filter(Boolean);

    return (
      <PhotoCard
        variant={variant}
        photo={photo}
        index={index}
        displayCatName={displayCatName}
        photoTags={photoTags}
      />
    );
  };

  return (
    <VirtualPhotoGrid
      photos={photos}
      isFetching={infiniteQuery.isLoading}
      isFetchingNextPage={infiniteQuery.isFetchingNextPage}
      hasNextPage={!!infiniteQuery.hasNextPage}
      onLoadMore={infiniteQuery.fetchNextPage}
      columns={columns}
      renderCard={renderCard}
    />
  );
}
