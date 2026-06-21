import React from 'react';
import { PhotoListItem } from '@/types/api';
import VirtualGrid from '@/components/virtualizer/VirtualGrid';
import { AdminPhotoCard } from './AdminPhotoCard';
import { PublicPhotoCard } from './PublicPhotoCard';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '@/components/ui/Icon';

import { LoadingContainer } from '@/components/ui/feedback';

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
  filters?: any;
  onPhotoClick?: (id: string, e?: React.MouseEvent) => void;
  gridRef?: React.Ref<any>;
  onScroll?: (offset: number) => void;
}

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

  if (isPending) {
    return (
      <div className="p-4 w-full h-full">
        <LoadingContainer loading={true} type="skeleton" skeletonType="grid" skeletonCount={Math.max(columns * 3, 12)}>
          <div />
        </LoadingContainer>
      </div>
    );
  }

  if (photos.length === 0) {
    const hasSearch = !!filters?.search;
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-brand-bg">
        <EmptyState 
          title={hasSearch ? 'No results found' : 'No photos'} 
          description={hasSearch ? 'Try searching with different keywords.' : undefined}
          icon={<Icon name="package-open" className="w-16 h-16 text-slate-300" />}
        />
      </div>
    );
  }

  return (
    <VirtualGrid
      ref={gridRef}
      onScroll={onScroll}
      count={photos.length}
      dataVersion={dataVersion}
      lanes={columns}
      itemSize={400} 
      shift={true}
      containerClassName="px-2 pt-2"
      onEndReached={fetchNextPage}
      renderItem={(index) => {
        const photo = photos[index];
        if (!photo) return null;
        return (
          <div key={photo.id} className="p-0.5 sm:p-1 w-full">
            {mode === 'admin' 
              ? <AdminPhotoCard 
                  photo={photo} 
                  onClick={(e) => onPhotoClick?.(photo.id, e)} 
                  showGroupsCollapsed={showGroupsCollapsed}
                  hasSearchQuery={hasSearchQuery}
                />
              : <PublicPhotoCard 
                  photo={photo} 
                  onClick={(e) => onPhotoClick?.(photo.id, e)} 
                  showGroupsCollapsed={showGroupsCollapsed}
                  hasSearchQuery={hasSearchQuery}
                />
            }
          </div>
        );
      }}
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
  );
}
