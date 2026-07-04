import { useEffect, useRef, useCallback } from 'react';
import { photoWallStore } from '../signal.js';
import { PhotoWallGrid } from './PhotoWallGrid.js';
import { usePhotoWall } from '#src/hooks/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

interface PhotoWallContainerProps {
  mode?: 'admin' | 'public';
  filters?: Record<string, unknown>;
  onPhotoClick?: (photo: PhotoListItem) => void;
}

export function PhotoWallContainer(props: PhotoWallContainerProps) {
  const { open: openLightbox } = useLightbox();
  const { photos, hasMore, isLoading, isLoadingMore, loadMore, error, refresh } = usePhotoWall(props.filters);

  // Use refs to avoid recreating the onPhotoClick closure and triggering full-grid rerenders on scroll
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const onPhotoClickRef = useRef(props.onPhotoClick);
  onPhotoClickRef.current = props.onPhotoClick;

  const handlePhotoClickStable = useCallback((photo: PhotoListItem) => {
    if (onPhotoClickRef.current) {
      onPhotoClickRef.current(photo);
    } else {
      const currentPhotos = photosRef.current;
      const slides = photosToLightboxSlides(currentPhotos);
      const index = currentPhotos.findIndex(p => p.id === photo.id);
      openLightbox(slides, index >= 0 ? index : 0);
    }
  }, [openLightbox]);

  // Only update store mode and stable callback reference when needed
  const mode = props.mode || 'public';
  useEffect(() => {
    photoWallStore.setState({
      mode,
      onPhotoClick: handlePhotoClickStable,
    });
  }, [mode, handlePhotoClickStable]);

  if (error) {
    ErrorFactory.handle(error, { context: 'photo-wall-load' });
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
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

  return (
    <PhotoWallGrid
      photos={photos}
      hasMore={hasMore}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      loadMore={loadMore}
    />
  );
}
