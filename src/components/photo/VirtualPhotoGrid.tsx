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
  restoreKey?: string;
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
  ref,
  restoreKey
}: VirtualPhotoGridProps) {
  const { filters } = useUrlFilters();
  const appLang = useUIStore((s) => s.appLang);
  const t = (translations[appLang as keyof typeof translations] || translations.en) as TranslationType;

  const internalGridRef = useRef<VirtualGridHandle | null>(null);
  // Merge refs
  const gridRef = (node: VirtualGridHandle | null) => {
    internalGridRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<VirtualGridHandle | null>).current = node;
    }
  };

  const isScrollRestoredRef = useRef(false);

  // Offset restoration
  useEffect(() => {
    if (restoreKey && photos.length > 0 && !isScrollRestoredRef.current && internalGridRef.current) {
      const saved = sessionStorage.getItem(restoreKey);
      if (saved) {
        try {
          const offset = parseFloat(saved);
          if (!isNaN(offset) && offset > 0) {
            isScrollRestoredRef.current = true;
            // timeout allows vlist to measure container
            setTimeout(() => {
              internalGridRef.current?.scrollTo(offset);
            }, 10);
            return; // Don't do index anchor if we have offset
          }
        } catch (e) {}
      }
    }
  }, [restoreKey, photos]);

  const handleScroll = (offset: number) => {
    if (restoreKey) {
      sessionStorage.setItem(restoreKey, offset.toString());
    }
  };

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
          ref={gridRef}
          count={photos.length}
          lanes={columns}
          itemSize={200}
          shift={false}
          onScroll={handleScroll}
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
