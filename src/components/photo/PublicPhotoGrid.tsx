import React from 'react';
import { usePhotoGrid } from '@/hooks/photo/usePhotoGrid';
import { PhotoGridContent } from './PhotoGridContent';

interface PublicPhotoGridProps {
  photos: any[];
  dataVersion: string;
  isPending: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  columns: number;
  filters: any;
  gridRef?: React.Ref<any>;
  onScroll?: (offset: number) => void;
}

export function PublicPhotoGrid({ 
  photos, 
  dataVersion, 
  isPending, 
  isFetching, 
  isFetchingNextPage, 
  hasNextPage, 
  fetchNextPage, 
  columns,
  filters,
  gridRef,
  onScroll
}: PublicPhotoGridProps) {
  return (
    <div className="h-full w-full relative">
      <PhotoGridContent 
        photos={photos}
        dataVersion={dataVersion}
        isPending={isPending}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        columns={columns}
        mode="public"
        filters={filters}
        gridRef={gridRef}
        onScroll={onScroll}
      />
    </div>
  );
}
