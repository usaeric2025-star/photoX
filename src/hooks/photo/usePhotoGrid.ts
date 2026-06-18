import { useEffect, useRef } from 'react';
import { VListHandle } from 'virtua';
import { PhotoListItem } from '@/types/api/photos';
import { usePhotoList, PhotoListFilters } from './usePhotoList';

export function usePhotoGrid(filters: PhotoListFilters, mode: 'admin' | 'public') {
  const { 
    data, 
    isPending, 
    isFetching, 
    isError,
    error,
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch 
  } = usePhotoList({ ...filters, mode });
  
  const dataVersion = JSON.stringify(filters);
  const ref = useRef<VListHandle>(null);

  // ✅ 篩選變更時重置滾動
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollToIndex(0);
    }
  }, [dataVersion]);

  return {
    photos: data?.pages.flatMap(p => p.items) || [],
    dataVersion,
    isPending,
    isFetching,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
    ref,
  };
}
