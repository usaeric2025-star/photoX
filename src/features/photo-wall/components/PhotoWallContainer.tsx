import { useEffect, useRef, useCallback } from 'react';
import { photoWallStore } from '../signal.js';
import { PhotoWallGrid } from './PhotoWallGrid.js';
import { usePhotoWall } from '#src/hooks/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';

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
    return (
      <div className="text-center py-20">
        <p className="text-red-500">加载失败</p>
        <button
          onClick={() => refresh()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
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
