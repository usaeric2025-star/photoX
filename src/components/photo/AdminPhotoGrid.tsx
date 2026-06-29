import React from 'react';
import { PhotoGridContent } from './PhotoGridContent';
import { useIsMultiSelect, useSelectionActions } from '@/features/selection';
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
  error?: unknown;
  onRetry?: () => void;
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
  filters,
  onPhotoClick,
  columns,
  error,
  onRetry
}: AdminPhotoGridProps) {
  const isMultiSelect = useIsMultiSelect();
  const { toggleSelect } = useSelectionActions();
  
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
        error={error}
        onRetry={onRetry}
        onPhotoClick={(id, index, e) => {
          if (isMultiSelect) {
            toggleSelect(id);
          } else {
            onPhotoClick?.(id, index, e);
          }
        }}
      />
    </div>
  );
}
