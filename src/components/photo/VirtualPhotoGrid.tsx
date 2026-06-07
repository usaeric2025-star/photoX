import React, { useEffect, useRef } from 'react';
import { VirtualGrid, VirtualGridHandle } from '@/components/virtualizer/VirtualGrid';
import { Photo, TranslationType } from '../../types';
import { useUIStore, useShallow, UIStoreState } from '@/store/useUIStore';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { translations } from '../../lib/translations';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { useImagePreloader } from '@/hooks';

interface VirtualPhotoGridProps {
  photos: Photo[];
  isFetching?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  renderCard: (photo: Photo, index: number) => React.ReactNode;
  columns: number;
  ref?: React.Ref<VirtualGridHandle>;
}

const multiSelectSelector = (s: UIStoreState) => ({
  update: s.update
});

export function VirtualPhotoGrid({
  photos,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  renderCard,
  columns,
  ref
}: VirtualPhotoGridProps) {
  const { filters } = useUrlFilters();
  const appLang = useUIStore((s) => s.appLang);
  const t = (translations[appLang as keyof typeof translations] || translations.en) as TranslationType;

  const isScrollRestoredRef = useRef(false);

  // Anchoring logic: when returning from a group detail view
  useEffect(() => {
    if (filters.groupId === null && photos.length > 0 && !isScrollRestoredRef.current) {
      const targetId = filters.photoId;
      if (targetId) {
        const index = photos.findIndex(p => p.id === targetId || p.group_id === targetId);
        if (index !== -1) {
          isScrollRestoredRef.current = true;
          setTimeout(() => {
            (ref as React.RefObject<VirtualGridHandle>)?.current?.scrollToIndex(index);
          }, 100);
        }
      }
    }
  }, [filters.groupId, photos, filters.photoId, ref]);

  useEffect(() => {
    // Reset flag if groupId changes (e.g. going back into a group)
    if (filters.groupId !== null) {
      isScrollRestoredRef.current = false;
    }
  }, [filters.groupId]);

  const { preloadBatch } = useImagePreloader();


  const isLoading = isFetching && photos.length === 0;

  if (isLoading) {
    return (
      <div className="absolute inset-0 z-10 bg-brand-bg overflow-y-auto">
        <PhotoGridSkeleton columns={columns} />
      </div>
    );
  }

  return (
    <div className="h-full w-full overscroll-y-contain relative">
      <div className="h-full w-full">
        <VirtualGrid
          ref={ref}
          count={photos.length}
          lanes={columns}
          itemSize={200}
          shift={false}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage && onLoadMore) {
              onLoadMore();
            }
          }}
          containerClassName="px-2 pt-2 pb-4"
          renderItem={(index) => {
            const photo = photos[index];
            if (!photo) return null;
            return (
              <div className="p-1.5 sm:p-2 w-full">
                {renderCard(photo, index)}
              </div>
            );
          }}
          footer={
            <div className="pt-4 pb-8">
               <LoadMoreIndicator 
                  isFetchingNextPage={!!isFetchingNextPage}
                  hasNextPage={!!hasNextPage}
                  onLoadMore={() => onLoadMore && onLoadMore()}
               />
            </div>
          }
        />
      </div>
    </div>
  );
}
