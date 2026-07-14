import { useEffect, useRef, useCallback } from 'react';
import { photoWallStore } from '../signal.js';
import { PhotoWallGrid } from './PhotoWallGrid.js';
import { usePhotoWall } from '#src/hooks/index.js';
import { PhotoListResponse } from '#src/hooks/photo/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { api } from '#lib/api.js';
import { useAppQuery } from '#lib/query/index.js';
import { useUI } from '#lib/store/index.js';
import { useTranslation } from '#src/hooks/index.js';
import { AdminEmptyState } from '#src/pages/AdminPage/AdminEmptyState.js';
import { PhotoErrorDisplay } from '#src/components/photo/PhotoErrorDisplay.js';

interface PhotoWallContainerProps {
  mode?: 'admin' | 'public';
  filters?: Record<string, unknown>;
  onPhotoClick?: (photo: PhotoListItem) => void;
}

import { useQueryState } from 'nuqs';
import { parseAsPhotoId } from '#lib/nuqs/parsers.js';

export function PhotoWallContainer(props: PhotoWallContainerProps) {
  const { open: openLightbox, setLightboxData } = useLightbox();
  const [photoId] = useQueryState('id', parseAsPhotoId);
  const { photos, total, hasMore, isLoading, isLoadingMore, loadMore, error, refresh } = usePhotoWall(props.filters);
  const patch = useUI(s => s.patch);
  const { uiTranslations: labels } = useTranslation();

  // Use refs to avoid recreating the onPhotoClick closure and triggering full-grid rerenders on scroll
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const onPhotoClickRef = useRef(props.onPhotoClick);
  onPhotoClickRef.current = props.onPhotoClick;

  const isAggregated = !!props.filters?.onlyGroupsCover;

  const expandedPhotosRef = useRef<PhotoListItem[] | null>(null);

  // Sync total count to global UI state
  useEffect(() => {
    if (total !== undefined) {
      patch({ totalCount: total });
    }
  }, [total, patch]);

  const handlePhotoClickStable = useCallback(async (photo: PhotoListItem) => {
    if (onPhotoClickRef.current) {
      onPhotoClickRef.current(photo);
      return;
    }

    const currentPhotos = photosRef.current;
    
    // If we have pre-fetched expanded photos, use them immediately
    if (isAggregated && expandedPhotosRef.current && expandedPhotosRef.current.length > 0) {
      const allPhotos = expandedPhotosRef.current;
      const expandedSlides = photosToLightboxSlides(allPhotos);
      
      let newIndex = allPhotos.findIndex(p => p.id === photo.id);
      if (newIndex === -1 && photo.groupId) {
        newIndex = allPhotos.findIndex(p => p.groupId === photo.groupId);
      }
      
      if (newIndex !== -1) {
        openLightbox(expandedSlides, newIndex);
        return;
      }
    }

    // Fallback: Open with current list first, then fetch
    const slides = photosToLightboxSlides(currentPhotos);
    const index = currentPhotos.findIndex(p => p.id === photo.id);
    
    openLightbox(slides, index >= 0 ? index : 0);

    if (isAggregated) {
      try {
        const result = await ErrorFactory.unwrap<PhotoListResponse>(
          api.photos.list.$post({ 
             json: { 
               ...props.filters,
               onlyGroupsCover: false,
               limit: 1000,
               isAdminMode: props.mode === 'admin'
            } 
          }),
          'Failed to load aggregated photos'
        );
        
        const allPhotos = result.items;
        expandedPhotosRef.current = allPhotos; // Update cache
        
        if (allPhotos && allPhotos.length > 0) {
            const expandedSlides = photosToLightboxSlides(allPhotos);
            
            let newIndex = allPhotos.findIndex((p: PhotoListItem) => p.id === photo.id);
            if (newIndex === -1 && photo.groupId) {
                newIndex = allPhotos.findIndex((p: PhotoListItem) => p.groupId === photo.groupId);
            }

            if (newIndex !== -1) {
              const currentPhotoId = photoId;
              
              let finalIndex = newIndex;
              if (currentPhotoId) {
                const indexInNewList = allPhotos.findIndex((p: PhotoListItem) => p.id === currentPhotoId);
                if (indexInNewList !== -1) {
                  finalIndex = indexInNewList;
                }
              }
              setLightboxData(expandedSlides, finalIndex);
            }
        }
      } catch (e) {
        ErrorFactory.handleError(e, 'Failed to background expand groups for lightbox');
      }
    }
  }, [openLightbox, setLightboxData, isAggregated, props.mode, props.filters]);

  // Only update store mode and stable callback reference when needed
  const mode = props.mode || 'public';
  useEffect(() => {
    photoWallStore.setState({
      mode,
      onPhotoClick: handlePhotoClickStable,
    });
  }, [mode, handlePhotoClickStable]);

  if (error) {
    if (props.mode === 'admin') {
      return (
        <div className="flex flex-col h-full overflow-hidden relative justify-center items-center p-8 w-full">
          <PhotoErrorDisplay error={error} onRetry={refresh} />
        </div>
      );
    }
    ErrorFactory.handle(error, { context: 'photo-wall-load' });
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 w-full">
        <div className="text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 max-w-md">
          <p className="font-bold">加载失败</p>
          <p className="text-sm opacity-80 mt-1">{error.message}</p>
        </div>
        <button
          onClick={() => refresh()}
          className="px-6 py-2.5 bg-primary text-white rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all font-medium"
        >
          重试
        </button>
      </div>
    );
  }

  if (photos.length === 0 && !isLoading) {
    if (props.mode === 'admin') {
      return (
        <div className="flex-1 flex flex-col overflow-hidden relative w-full h-full">
          <AdminEmptyState labels={labels} />
        </div>
      );
    }
    return (
      <div className="text-center py-20 text-gray-500 w-full h-full flex flex-col justify-center items-center min-h-[400px]">
        暂无照片
      </div>
    );
  }

  return (
    <PhotoWallGrid
      photos={photos}
      hasMore={hasMore}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      loadMore={loadMore}
      isAggregated={isAggregated}
    />
  );
}
