import { useMemo, useEffect, useState } from 'react';
import { useGroupPhotos } from '@/hooks/photo/usePhotos';
import { ReelkitAdapter } from './ReelkitAdapter';
import { Photo } from '@/types';

interface GroupLightboxProps {
  groupId: string;
  initialPhotoId?: string | null;
  onClose: () => void;
  onEdit?: (photoId: string) => void;
}

export const GroupLightbox = ({ groupId, initialPhotoId, onClose, onEdit }: GroupLightboxProps) => {
  const { photos, isLoading } = useGroupPhotos(groupId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const initialIndex = useMemo(() => {
    if (!photos || photos.length === 0 || !initialPhotoId) return 0;
    const index = photos.findIndex((p: Photo) => p.id === initialPhotoId);
    return index === -1 ? 0 : index;
  }, [photos, initialPhotoId]);

  useEffect(() => {
    if (photos.length > 0 && initialPhotoId && !open) {
      setCurrentIndex(initialIndex);
      setOpen(true);
    }
  }, [photos, initialPhotoId, initialIndex, open]);

  if (isLoading || !photos?.length) return null;

  const items = photos.map((p: Photo) => ({
    src: p.image_url || '',
    alt: (p.name as any)?.zh || String(p.name || ''),
  }));

  return (
    <ReelkitAdapter
      open={open}
      items={items}
      currentIndex={currentIndex}
      onClose={() => {
        setOpen(false);
        onClose();
      }}
      onIndexChange={setCurrentIndex}
      onEdit={(idx) => onEdit?.(photos[idx].id)}
    />
  );
};
