import React, { useEffect, useRef } from 'react';
import { VListHandle } from 'virtua';
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
  const ref = useRef<VListHandle>(null);

  // ✅ 篩選變更時重置滾動
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollToIndex(0);
    }
  }, [dataVersion]);

  const sortedPhotos = React.useMemo(() => {
    const photos = data?.pages.flatMap(p => p.items) || [];
    return [...photos].sort((a, b) => {
      const aHidden = !!a.isHidden;
      const bHidden = !!b.isHidden;
      if (aHidden && !bHidden) return 1;
      if (!aHidden && bHidden) return -1;
      return 0;
    });
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
