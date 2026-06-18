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
  filters
}: AdminPhotoGridProps) {
  const { isMultiSelect } = useUIStore();
  
  const allIds = React.useMemo(() => photos.map(p => p.id), [photos]);

  return (
    <SelectionProvider>
      <div className="h-full w-full">
        {isMultiSelect && (
          <SelectionToolbar 
            allIds={allIds} 
            totalItems={photos.length} 
            allPhotos={photos as any} 
          />
        )}
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
        />
      </div>
    </SelectionProvider>
  );
}
