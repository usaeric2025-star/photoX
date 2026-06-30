import React from 'react';
import { motion } from 'lite-sleek';
import { PhotoListItem } from '@/types/api';
import { AdminPhotoCard } from './AdminPhotoCard';
import { PublicPhotoCard } from './PublicPhotoCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSignal } from '@/lib/store';
import { gridColumns as gridColumnsSignal } from '@/lib/store';
import { usePermission, useTranslation } from '@/hooks';
import { CardSkeleton } from '@/components/photo/CardSkeleton';
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
  mode: 'admin' | 'public';
  filters?: Record<string, unknown>;
  error?: unknown;
  onRetry?: () => void;
  onPhotoClick?: (id: string, index: number, e?: React.MouseEvent) => void;
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
  mode,
  filters,
  error,
  onRetry,
  onPhotoClick,
  gridRef,
  onScroll,
}: PhotoGridContentProps) {
  const showGroupsCollapsed = filters?.showGroupsCollapsed !== false;
  const hasSearchQuery = !!filters?.search;
  
  const actualColumns = (useSignal(gridColumnsSignal) as number) || 3;
  const { can } = usePermission();
  const { uiTranslations } = useTranslation();
  const canPinGlobal = can('photo:toggle-pinned');

  const renderItem = React.useCallback((photo: PhotoListItem, index: number) => {
    return (
      <motion.div
        initial={{ opacity: 0, transform: 'translateY(10px)' }}
        animate={{ opacity: 1, transform: 'translateY(0)' }}
        transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        className="w-full h-full p-[1px]"
      >
        {mode === 'admin' ? (
          <AdminPhotoCard 
            photo={photo} 
            onClick={(e: any) => onPhotoClick?.(photo.id, index, e)} 
            showGroupsCollapsed={showGroupsCollapsed}
            hasSearchQuery={hasSearchQuery}
            canPinGlobal={canPinGlobal}
          />
        ) : (
          <PublicPhotoCard 
            photo={photo} 
            onClick={(e: any) => onPhotoClick?.(photo.id, index, e)} 
            showGroupsCollapsed={showGroupsCollapsed}
            hasSearchQuery={hasSearchQuery}
          />
        )}
      </motion.div>
    );
  }, [mode, onPhotoClick, showGroupsCollapsed, hasSearchQuery, canPinGlobal]);

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
