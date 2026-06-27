import React from 'react';
import { PhotoGridContent } from './PhotoGridContent';
import { useSelection } from '@/features/selection';
import { Category } from '@/types/photo';
import { PhotoListItem } from '@/types/api';

interface AdminPhotoGridProps {
  photos: PhotoListItem[];
  dataVersion: string;
  isPending: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  columns: number;
  filters: Record<string, unknown>;
  categories?: Category[];
  onPhotoClick?: (id: string, index: number, e?: React.MouseEvent) => void;
}

export function AdminPhotoGrid({ 
  photos, 
  dataVersion, 
  isPending, 
  isFetching, 
  isFetchingNextPage, 
  hasNextPage, 
  fetchNextPage, 
  columns,
  filters,
  onPhotoClick
}: AdminPhotoGridProps) {
  const { state } = useSelection();
  const multiSelect = state.mode === 'batch';
  
  const allIds = React.useMemo(() => (photos || []).map(p => p.id), [photos]);

  return (
    <div className="h-full w-full relative">
      <PhotoGridContent 
        photos={photos || []}
        dataVersion={dataVersion}
        isPending={isPending}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        columns={columns}
        mode="admin"
        filters={filters}
        onPhotoClick={onPhotoClick}
      />
    </div>
  );
}
