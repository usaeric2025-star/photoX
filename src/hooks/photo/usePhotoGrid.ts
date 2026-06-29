import React, { useEffect, useRef } from 'react';
import { PhotoListItem } from '@/types/api';
import { usePhotos, PhotoListFilters } from './usePhotos';

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
  } = usePhotos({ ...filters, isAdminMode: mode === 'admin' });
  
  // ✅ Only reset scroll when content-affecting filters change
  const contentFilters = { ...filters };
  delete contentFilters.photoId;
  delete contentFilters.modal;
  delete contentFilters.anchor;
  
  const dataVersion = JSON.stringify(contentFilters);
  const ref = useRef<any>(null);

  // ✅ 篩選變更時重置滾動
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollToIndex(0);
    }
  }, [dataVersion]);

  const sortedPhotos = React.useMemo(() => {
    return data?.pages.flatMap(p => p.items) || [];
  }, [data]);

  return {
    photos: sortedPhotos,
    totalCount: data?.pages[0]?.total || 0,
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
