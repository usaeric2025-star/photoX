import React from 'react';
import { PhotoListItem } from '@/types/api';
import VirtualGrid from '@/components/virtualizer/VirtualGrid';
import { AdminPhotoCard } from './AdminPhotoCard';
import { PublicPhotoCard } from './PublicPhotoCard';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { useSignal } from '@/lib/store';
import { gridColumns as gridColumnsSignal } from '@/lib/store';
import { usePermission } from '@/hooks';

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

export function PhotoGridContent({ 
  photos, 
  dataVersion, 
  isPending, 
  mode,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  filters,
  onPhotoClick,
  gridRef,
  onScroll
}: Omit<PhotoGridContentProps, 'columns'>) {
  const showGroupsCollapsed = filters?.showGroupsCollapsed !== false;
  const hasSearchQuery = !!filters?.search;
  
  const columns = useSignal(gridColumnsSignal);
  const { can } = usePermission();
  const canPinGlobal = can('photo:toggle-pinned');

  const safePhotos = photos || [];
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const newWidth = entries[0].contentRect.width;
      setContainerWidth((prev) => Math.abs(newWidth - prev) > 10 ? newWidth : prev);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const estimatedHeight = React.useMemo(() => {
    const width = containerWidth || 1200;
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
              onClick={(e) => onPhotoClick?.(photo.id, index, e)} 
              showGroupsCollapsed={showGroupsCollapsed}
              hasSearchQuery={hasSearchQuery}
              canPinGlobal={canPinGlobal}
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
  }, [safePhotos, mode, showGroupsCollapsed, hasSearchQuery, onPhotoClick, canPinGlobal]);

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
          action={mode === 'admin' ? {
            label: '强制刷新数据',
            onClick: async () => {
              try {
                const { api } = await import('@/lib/api');
                await api.admin['refresh-view'].$post();
                window.location.reload();
              } catch (err) {
                console.error('Failed to refresh view:', err);
                alert('刷新失败，请检查控制台日记');
              }
            }
          } : undefined}
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
