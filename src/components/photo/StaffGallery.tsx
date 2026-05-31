import React, { useMemo, useCallback } from 'react';
import { GalleryVariant } from '@/types/variant';
import PhotoBoard from '@/components/photo/PhotoGrid';
import { GalleryFilters } from '@/components/ui/GalleryFilters';
import { useGalleryStore, useShallow } from '@/store/galleryStore';
import { usePhotoInfiniteList, useFilters, usePhotoFilters, useCategoryList, useTagList, useAdminMode } from '@/hooks';
import { PAGINATION } from '@/constants/config';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupDetailView } from '../GroupDetailView';
import { PhotoCard } from './PhotoCard';
import { Photo, Category, Tag } from '@/types';

interface StaffGalleryProps {
  variant: GalleryVariant;
  onScrollToTop: () => void;
  virtualGridRef: any;
}

const EMPTY_ARRAY: Photo[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_TAGS: Tag[] = [];

export const StaffGallery: React.FC<StaffGalleryProps> = ({
  variant,
  onScrollToTop,
  virtualGridRef,
}) => {
  const { filters } = useFilters();
  const { 
    lightboxIndex, setLightboxIndex, sortOrder,
    activeGroupId, setActiveGroupId, activePhotoId, setActivePhotoId,
    columns
  } = useGalleryStore(useShallow(s => ({
    lightboxIndex: s.lightboxIndex,
    setLightboxIndex: s.setLightboxIndex,
    sortOrder: s.sortOrder,
    activeGroupId: s.activeGroupId,
    setActiveGroupId: s.setActiveGroupId,
    activePhotoId: s.activePhotoId,
    setActivePhotoId: s.setActivePhotoId,
    columns: s.columns
  })));

  const categories = useCategoryList().data ?? EMPTY_CATEGORIES;
  const tags = useTagList().data ?? EMPTY_TAGS;

  const isAdminMode = useAdminMode();

  const infiniteQuery = usePhotoInfiniteList({
    category_id: filters.categoryId,
    tag_id: Array.isArray(filters.tagIds) && filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: sortOrder,
    isAdminMode: isAdminMode
  }, PAGINATION.ADMIN_BATCH_SIZE, true);

  const photos = useMemo(() => {
    return infiniteQuery.data?.pages?.flatMap(p => p.photos) ?? EMPTY_ARRAY;
  }, [infiniteQuery.data]);

  const { displayPhotos, gridPhotos } = usePhotoFilters(
    photos,
    categories,
    tags,
    {
      showGroupsCollapsed: filters.showGroupsCollapsed,
      isAdminModeOverride: isAdminMode
    }
  );

  const handleGroupClick = useCallback((gid: string, photoId?: string) => {
    setActiveGroupId(gid);
    setActivePhotoId(null);
  }, [setActiveGroupId, setActivePhotoId]);

  const handleLightboxOpen = useCallback((photo: Photo) => {
    setActivePhotoId(photo.id);
  }, [setActivePhotoId]);

  const renderCard = useCallback((photo: Photo, index: number) => (
    <PhotoCard 
      photo={photo}
      index={index}
      variant={variant}
      showGroupsCollapsed={filters.showGroupsCollapsed}
      onGroupClick={(gid) => handleGroupClick(gid, photo.id)}
      onLightboxOpen={handleLightboxOpen}
    />
  ), [variant, filters.showGroupsCollapsed, handleGroupClick, handleLightboxOpen]);

  return (
    <div className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text">
        <GalleryFilters 
          onScrollToTop={onScrollToTop}
          variant={variant}
        />
        <div className="flex-1 overflow-hidden bg-brand-bg relative">
            <PhotoBoard 
              photos={gridPhotos}
              isFetching={infiniteQuery.isLoading}
              isFetchingNextPage={infiniteQuery.isFetchingNextPage}
              hasNextPage={!!infiniteQuery.hasNextPage}
              onLoadMore={infiniteQuery.fetchNextPage}
              renderCard={renderCard}
              virtualGridRef={virtualGridRef} 
              columns={columns}
            />
        </div>

        {!activeGroupId && activePhotoId && (
          <PhotoLightbox 
            photoId={activePhotoId}
            displayPhotos={displayPhotos}
            onClose={() => setActivePhotoId(null)}
          />
        )}

        <GroupDetailView
          activeGroupId={activeGroupId}
          setActiveGroupId={setActiveGroupId}
          initialPhotoId={activePhotoId}
          setLightboxIndex={setLightboxIndex}
          variant={variant}
        />
    </div>
  );
};
