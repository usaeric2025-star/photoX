import React from 'react';
import { usePhotoGrid } from '@/hooks/photo/usePhotoGrid';
import { useUIStore } from '@/store/useUIStore';
import { PhotoGridContent } from './PhotoGridContent';
import { SelectionProvider, SelectionToolbar } from '@/features/selection';

interface AdminPhotoGridProps {
  photos: any[];
  dataVersion: string;
  isPending: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  columns: number;
  filters: any;
  categories?: any[];
  onPhotoClick?: (id: string, e?: React.MouseEvent) => void;
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
  const { isMultiSelect } = useUIStore();
  
  const allIds = React.useMemo(() => photos.map(p => p.id), [photos]);

  return (
    <SelectionProvider>
      <div className="h-full w-full">
        <PhotoGridContent 
          photos={photos}
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
        {isMultiSelect && (
          <SelectionToolbar 
            allIds={allIds} 
            totalItems={photos.length} 
            allPhotos={photos as any} 
          />
        )}
      </div>
    </SelectionProvider>
  );
}
