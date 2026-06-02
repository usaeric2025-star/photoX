import React, { useEffect, useRef, useCallback } from 'react';
import { usePerformance } from '@/hooks/usePerformance';
import { VirtualGrid, VirtualGridHandle } from '@/components/virtualizer/VirtualGrid';
import { Photo, TranslationType } from '../../types';
import { useUIStore, useShallow, UIStoreState } from '@/store/useUIStore';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { translations } from '../../lib/translations';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { useImagePreloader } from '@/hooks/useImagePreloader';

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
  usePerformance('VirtualPhotoGrid');
  const { filters } = useUrlFilters();
  const appLang = useUIStore((s) => s.appLang);
  const t = (translations[appLang as keyof typeof translations] || translations.en) as TranslationType;

  // Anchoring logic: when returning from a group detail view
  useEffect(() => {
    if (filters.groupId === null && photos.length > 0) {
      const targetId = filters.photoId;
      if (targetId) {
        const index = photos.findIndex(p => p.id === targetId || p.group_id === targetId);
        if (index !== -1) {
          setTimeout(() => {
            (ref as React.RefObject<VirtualGridHandle>)?.current?.scrollToIndex(index);
          }, 100);
        }
      }
    }
  }, [filters.groupId, photos, filters.photoId, ref]);

  const { preloadBatch } = useImagePreloader();

  const handleRangeChange = useCallback((start: number, end: number) => {
    const preloadStart = Math.max(0, start * columns - 10);
    const preloadEnd = Math.min(photos.length, end * columns + 10);
    const urlsToPreload = photos
      .slice(preloadStart, preloadEnd)
      .map(item => item.image_url)
      .filter(Boolean);
    preloadBatch(urlsToPreload);
  }, [photos, preloadBatch, columns]);

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
          onRangeChange={handleRangeChange}
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
