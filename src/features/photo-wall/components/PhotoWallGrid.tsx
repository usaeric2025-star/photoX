import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { DreamMasonry } from 'dream-masonry';
import { PhotoListItem } from '#src/types/api.js';
import { PhotoCard } from './PhotoCard.js';
import { useGrid } from '#src/context/GridContext.js';

interface PhotoWallGridProps {
  photos: PhotoListItem[];
  hasMore: boolean;
  isLoading?: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  hideGroupBadge?: boolean;
  isGroupDetail?: boolean;
}

export function PhotoWallGrid({
  photos,
  hasMore,
  isLoading = false,
  isLoadingMore,
  loadMore,
  hideGroupBadge = false,
  isGroupDetail = false,
}: PhotoWallGridProps) {
  const { columns } = useGrid();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Find closest parent that is scrollable
    let parent = containerRef.current.parentElement;
    while (parent) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        setScrollParent(parent);
        break;
      }
      parent = parent.parentElement;
    }
  }, []);

  // Create a new ref-like object whenever scrollParent resolves/changes
  // to force dream-masonry's hooks (useGrid, useInfiniteScroll) to re-run and bind listeners correctly
  const scrollContainer = useMemo(() => {
    if (!scrollParent) return null;
    return { current: scrollParent };
  }, [scrollParent]);

  const handleLoadMore = useCallback(async () => {
    loadMore();
  }, [loadMore]);

  const renderItem = useCallback((photo: PhotoListItem, index?: number) => (
    <div className="w-full h-full" data-photo-id={photo.id}>
      <PhotoCard 
        photo={photo} 
        hideGroupBadge={hideGroupBadge} 
        isGroupDetail={isGroupDetail} 
        priority={typeof index === 'number' && index < 12}
      />
    </div>
  ), [hideGroupBadge, isGroupDetail]);

  const renderLoader = useCallback(() => (
    <div className="flex justify-center items-center py-12 w-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ), []);

  const renderEmpty = useCallback(() => (
    <div className="text-center py-20 text-gray-500 w-full">
      暂无照片
    </div>
  ), []);

  return (
    <div ref={containerRef} className="page-container pt-4 pb-32">
      <DreamMasonry
        key={scrollParent ? 'resolved' : 'pending'}
        items={photos as PhotoListItem[]}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        isLoading={isLoading && !photos.length}
        isFetchingMore={isLoadingMore}
        scrollContainer={scrollContainer as React.RefObject<HTMLElement> | undefined}
        maxColumnCount={columns}
        minColumnCount={columns}
        minColumnWidth={10}
        gutterSize={12}
        renderItem={renderItem}
        renderLoader={renderLoader}
        renderEmpty={renderEmpty}
        scrollThreshold={3000}
        overscan={2400}
        hysteresis={20}
      />
      
      {isLoadingMore && (
        <div className="py-4 flex justify-center w-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}

