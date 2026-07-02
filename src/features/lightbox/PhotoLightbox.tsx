import { useState, useEffect, useCallback } from 'react';
import { motion } from 'lite-sleek';
import { useLightbox } from '#lib/lightbox/index.js';
import { useFilters } from '#src/features/filters/index.js';
import { usePermission } from '#src/hooks/core/auth/usePermission.js';

// Components
import { LightboxStage } from './components/LightboxStage.js';
import { LightboxThumbnails } from './components/LightboxThumbnails.js';
import { LightboxHeader } from './components/LightboxHeader.js';
import { LightboxInfo } from './components/LightboxInfo.js';

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
  
  const sourcePhotos = (props.photos && props.photos.length > 0) ? props.photos : hookSlides;
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

  // ✅ Deep Link support: if we have an ID but no slides, use a dummy slide that we'll populate with usePhoto details if needed
  // (Note: usePhoto logic is already inside components like LightboxInfo and Stage handles its own loading)
  
  // If we have an ID but no photos list (e.g. direct refresh), we need to show at least one slide to render the stage
  const effectivePhotos = (sourcePhotos.length === 0 && isOpen) 
    ? [{ id: (props as any).photoId || '' }] 
    : sourcePhotos;

  const handleNext = useCallback(() => {
    if (effectivePhotos.length <= 1) return;
    const nextIdx = (currentIndex + 1) % effectivePhotos.length;
    setLightboxIndex(nextIdx);
    
    // Update URL if applicable
    const photoData = effectivePhotos[nextIdx]?.original || effectivePhotos[nextIdx];
    const id = (photoData as any)?.id;
    if (id) {
      setPhotoId(id);
    }
  }, [effectivePhotos, currentIndex, setLightboxIndex, setPhotoId]);

  const handlePrev = useCallback(() => {
    if (effectivePhotos.length <= 1) return;
    const prevIdx = (currentIndex - 1 + effectivePhotos.length) % effectivePhotos.length;
    setLightboxIndex(prevIdx);
    
    // Update URL if applicable
    const photoData = effectivePhotos[prevIdx]?.original || effectivePhotos[prevIdx];
    const id = (photoData as any)?.id;
    if (id) {
      setPhotoId(id);
    }
  }, [effectivePhotos, currentIndex, setLightboxIndex, setPhotoId]);

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

  if (!isOpen) return null;
  if (effectivePhotos.length === 0) return null;
  
  const activePhoto = effectivePhotos[currentIndex] || effectivePhotos[0];

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
          currentPhoto={activePhoto}
          currentIndex={currentIndex}
          totalPhotos={effectivePhotos.length}
          showInfo={showInfo}
          isAdmin={isAdmin}
          onToggleInfo={() => setShowInfo(!showInfo)}
          onEdit={onEdit}
          onClose={onClose}
        />

        {/* Info Panel */}
        <LightboxInfo
          currentPhoto={activePhoto}
          showInfo={showInfo}
          lang={lang}
          onLangChange={setLang}
        />

        {/* Main Stage */}
        <LightboxStage
          currentPhoto={activePhoto}
          currentIndex={currentIndex}
          totalPhotos={effectivePhotos.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={onClose}
          photos={effectivePhotos}
        />

        {/* Thumbnails */}
        <LightboxThumbnails
          photos={effectivePhotos}
          currentIndex={currentIndex}
          isOpen={isOpen}
          onSelect={(idx) => {
            setLightboxIndex(idx);
            const photoData = effectivePhotos[idx]?.original || effectivePhotos[idx];
            const id = (photoData as any)?.id;
            if (id) setPhotoId(id);
          }}
        />
      </div>
    </div>
  );
}
