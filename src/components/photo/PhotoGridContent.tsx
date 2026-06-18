import React from 'react';
import { PhotoListItem } from '@/types/api';
import { VirtualGrid } from '@/components/virtualizer/VirtualGrid';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';
import { AdminPhotoCard } from './AdminPhotoCard';
import { PublicPhotoCard } from './PublicPhotoCard';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { EmptyState } from '../ui/EmptyState';
import { PackageOpen } from 'lucide-react';

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
  filters?: Record<string, unknown> | null;
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
  filters
}: PhotoGridContentProps) {
  
  if (isPending) {
    return <PhotoGridSkeleton columns={columns} count={20} />;
  }

  if (photos.length === 0) {
    const hasSearch = !!filters?.search;
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-brand-bg">
        <EmptyState 
          title={hasSearch ? 'No results found' : 'No photos'} 
          description={hasSearch ? 'Try searching with different keywords.' : undefined}
          icon={<PackageOpen className="w-16 h-16 text-slate-300" />}
        />
      </div>
    );
  }

  return (
    <VirtualGrid
      count={photos.length}
      dataVersion={dataVersion}
      lanes={columns}
      itemSize={400} // Simplified for now
      shift={true}
      containerClassName="px-2 pt-2 pb-4"
      renderItem={(index) => {
        const photo = photos[index];
        if (!photo) return null;
        return (
          <div key={photo.id} className="p-0.5 sm:p-1 w-full">
            {mode === 'admin' 
              ? <AdminPhotoCard photo={photo} />
              : <PublicPhotoCard photo={photo} />
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
