import React from 'react';
import { PhotoListItem } from '@/types/api';
import VirtualGrid from '@/components/virtualizer/VirtualGrid';
import { AdminPhotoCard } from './AdminPhotoCard';
import { PublicPhotoCard } from './PublicPhotoCard';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '@/components/ui/Icon';

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
  onPhotoClick?: (id: string, index: number, e?: React.MouseEvent) => void;
  gridRef?: React.Ref<import('virtua').VListHandle>;
  onScroll?: (offset: number) => void;
}

function CardSkeleton() {
  return (
    <div className="aspect-square w-full bg-surface-soft rounded-2xl overflow-hidden relative border border-border-soft animate-pulse">
      <div className="absolute bottom-0 left-0 w-full p-3 space-y-2 bg-gradient-to-t from-black/10 to-transparent">
        <div className="h-4 w-3/4 bg-white/10 rounded-full" />
        <div className="flex gap-2">
          <div className="h-2 w-12 bg-white/5 rounded-full" />
          <div className="h-2 w-12 bg-white/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

import { useUI, type UIStoreState, selectedSetSelector, useSignal } from '@/lib/store';
import { logger } from '@/lib/logger';

export function PhotoGridContent({ 
  photos, 
  dataVersion, 
  isPending, 
  columns, 
  mode,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  filters,
  onPhotoClick,
  gridRef,
  onScroll
}: PhotoGridContentProps) {
  const showGroupsCollapsed = filters?.showGroupsCollapsed !== false;
  const hasSearchQuery = !!filters?.search;
  
  const selectedSet = useUI(selectedSetSelector);
  
  const safePhotos = photos || [];
  
  logger.debug('[PhotoGridContent] Render Start', { mode, photosCount: safePhotos.length, isPending, columns });

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const newWidth = entries[0].contentRect.width;
      // 只有在寬度變化超過 5px 時才更新
      if (Math.abs(newWidth - containerWidth) > 5) {
        setContainerWidth(newWidth);
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [containerWidth]);

  const estimatedHeight = React.useMemo(() => {
    const width = containerWidth || 1200;
    // Each column is containerWidth / columns. Padding of p-0.5 or sm:p-1 doesn't add to row height because
    // the card has style aspect-square (1:1), so outerHeight === outerWidth === containerWidth / columns.
    const itemHeight = Math.round(width / columns);
    return Math.max(120, itemHeight);
  }, [containerWidth, columns]);

  const renderItem = React.useCallback((index: number) => {
    const photo = safePhotos[index];
    if (!photo) return null;
    return (
      <div key={photo.id} className="p-0.5 sm:p-1 w-full">
        {mode === 'admin' 
          ? <AdminPhotoCard 
              photo={photo} 
              selected={selectedSet.has(photo.id)}
              onClick={(e) => onPhotoClick?.(photo.id, index, e)} 
              showGroupsCollapsed={showGroupsCollapsed}
              hasSearchQuery={hasSearchQuery}
            />
          : <PublicPhotoCard 
              photo={photo} 
              onClick={(e) => onPhotoClick?.(photo.id, index, e)} 
              showGroupsCollapsed={showGroupsCollapsed}
              hasSearchQuery={hasSearchQuery}
            />
        }
      </div>
    );
  }, [safePhotos, mode, selectedSet, showGroupsCollapsed, hasSearchQuery, onPhotoClick]);

  if (isPending) {
    const skeletonCount = Math.max(columns * 3, 12);
    return (
      <div className="p-2 w-full h-full">
        <div 
           className="grid gap-1 sm:gap-2" 
           style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
           {Array.from({ length: skeletonCount }).map((_, i) => (
             <CardSkeleton key={i} />
           ))}
        </div>
      </div>
    );
  }

  if (safePhotos.length === 0) {
    const hasSearch = !!filters?.search;
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-brand-bg">
        <EmptyState 
          title={hasSearch ? '没有找到相关照片' : '暂无照片数据'} 
          description={hasSearch ? '尝试使用不同的关键词搜索。' : '如果看到此消息且确定有数据，请尝试在管理端刷新缓存。'}
          icon={<Icon name="package-open" className="w-16 h-16 text-slate-300" />}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-0 relative">
      <VirtualGrid
        ref={gridRef}
        onScroll={onScroll}
        count={safePhotos.length}
        dataVersion={dataVersion}
        lanes={columns}
        itemSize={estimatedHeight} 
        containerClassName="px-2 pt-2"
        onEndReached={fetchNextPage}
        renderItem={renderItem}
        footer={
          <div className="pt-4 pb-8">
             <LoadMoreIndicator 
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                onLoadMore={fetchNextPage}
             />
          </div>
        }
      />
    </div>
  );
}
