import { useState, useEffect, useCallback } from 'react';
import { motion } from 'lite-sleek';
import { useLightbox } from '#lib/lightbox';
import { useFilters } from '#src/features/filters';
import { usePermission } from '#src/hooks/core/auth/usePermission';

// Components
import { LightboxStage } from './components/LightboxStage';
import { LightboxThumbnails } from './components/LightboxThumbnails';
import { LightboxHeader } from './components/LightboxHeader';
import { LightboxInfo } from './components/LightboxInfo';

interface PhotoLightboxProps {
  photos?: any[];
  initialIndex?: number;
  isOpen?: boolean;
  onClose?: () => void;
  onEdit?: (photo: any) => void;
}

export function PhotoLightbox(props: Partial<PhotoLightboxProps>) {
  const { 
    isOpen: hookIsOpen, 
    slides: hookSlides, 
    currentIndex: hookIndex, 
    close: hookClose,
    setLightboxIndex
  } = useLightbox();
  
  const photos = (props.photos && props.photos.length > 0) ? props.photos : hookSlides;
  const currentIndex = props.initialIndex ?? hookIndex;
  const isOpen = props.isOpen ?? hookIsOpen;
  const onClose = props.onClose || hookClose;
  const { setPhotoId, setModal } = useFilters();
  const { isAdmin } = usePermission();
  
  const onEdit = props.onEdit || ((photo: any) => {
    setPhotoId(photo.id);
    setModal('edit');
  });

  const [showInfo, setShowInfo] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en' | 'ms'>('zh');

  useEffect(() => {
    if (isOpen) {
      setShowInfo(false);
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    const nextIdx = (currentIndex + 1) % photos.length;
    setLightboxIndex(nextIdx);
    
    // Update URL if applicable
    const photoData = photos[nextIdx]?.original || photos[nextIdx];
    const id = (photoData as any)?.id;
    if (id) {
      setPhotoId(id);
    }
  }, [photos, currentIndex, setLightboxIndex, setPhotoId]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    const prevIdx = (currentIndex - 1 + photos.length) % photos.length;
    setLightboxIndex(prevIdx);
    
    // Update URL if applicable
    const photoData = photos[prevIdx]?.original || photos[prevIdx];
    const id = (photoData as any)?.id;
    if (id) {
      setPhotoId(id);
    }
  }, [photos, currentIndex, setLightboxIndex, setPhotoId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col font-sans select-none">
      {/* Dynamic Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition="medium"
        className="absolute inset-0 bg-black/98 z-[110]"
      />

      <div className="relative z-[120] flex-1 flex flex-col h-full">
        {/* Header Controls */}
        <LightboxHeader
          currentPhoto={currentPhoto}
          currentIndex={currentIndex}
          totalPhotos={photos.length}
          showInfo={showInfo}
          isAdmin={isAdmin}
          onToggleInfo={() => setShowInfo(!showInfo)}
          onEdit={onEdit}
          onClose={onClose}
        />

        {/* Info Panel */}
        <LightboxInfo
          currentPhoto={currentPhoto}
          showInfo={showInfo}
          lang={lang}
          onLangChange={setLang}
        />

        {/* Main Stage */}
        <LightboxStage
          currentPhoto={currentPhoto}
          currentIndex={currentIndex}
          totalPhotos={photos.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={onClose}
        />

        {/* Thumbnails */}
        <LightboxThumbnails
          photos={photos}
          currentIndex={currentIndex}
          isOpen={isOpen}
          onSelect={(idx) => {
            setLightboxIndex(idx);
            const photoData = photos[idx]?.original || photos[idx];
            const id = (photoData as any)?.id;
            if (id) setPhotoId(id);
          }}
        />
      </div>
    </div>
  );
}
