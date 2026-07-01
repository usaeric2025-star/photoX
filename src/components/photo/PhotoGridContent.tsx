import React from 'react';
import { motion } from 'lite-sleek';
import { PhotoListItem } from '#src/types/api';
import { EmptyState } from '#src/components/ui/EmptyState';
import { useSignal } from '#lib/store';
import { gridColumns as gridColumnsSignal } from '#lib/store';
import { useTranslation } from '#src/hooks';
import { CardSkeleton } from '#src/components/photo/CardSkeleton';
import { VirtualizedGrid } from './VirtualizedGrid';
import { PhotoErrorDisplay } from './PhotoErrorDisplay';

interface PhotoGridContentProps {
  photos: PhotoListItem[];
  dataVersion: string;
  isPending: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  columns: number;
  renderItem: (photo: PhotoListItem, index: number) => React.ReactNode;
  error?: unknown;
  onRetry?: () => void;
  onScroll?: (offset: number) => void;
  gridRef?: React.Ref<any>;
}

export function PhotoGridContent({ 
  photos, 
  dataVersion,
  isPending,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  columns,
  renderItem,
  error,
  onRetry,
  gridRef,
  onScroll,
}: PhotoGridContentProps) {
  const actualColumns = (useSignal(gridColumnsSignal) as number) || 3;
  const { uiTranslations } = useTranslation();

  const safePhotos = photos || [];

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 w-full h-full min-h-[400px]">
        <PhotoErrorDisplay error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (isPending && !safePhotos.length) {
    const skeletonCount = Math.max(actualColumns * 3, 12);
    return (
      <div className="p-2 w-full h-full">
        <div 
           className="grid gap-1 sm:gap-2" 
           style={{ gridTemplateColumns: `repeat(${actualColumns}, minmax(0, 1fr))` }}
        >
           {Array.from({ length: skeletonCount }).map((_, i) => (
             <CardSkeleton key={i} />
           ))}
        </div>
      </div>
    );
  }

  if (!safePhotos.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 w-full h-full min-h-[400px]">
        <EmptyState title={uiTranslations.noPhotos} />
      </div>
    );
  }

  return (
    <div className="w-full h-full p-1 sm:p-2 relative">
      <VirtualizedGrid
        items={safePhotos}
        columns={actualColumns}
        columnGap={4}
        rowGap={4}
        containerRef={gridRef}
        onScroll={onScroll}
        onScrollEnd={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        footer={
          isFetchingNextPage ? (
            <div className="py-8 flex justify-center w-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span>{uiTranslations.loadingMore}</span>
              </div>
            </div>
          ) : null
        }
        renderItem={renderItem}
      />
    </div>
  );
}
