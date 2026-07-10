import { useState, useEffect, useCallback, useMemo } from 'react';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { cn } from "#lib/utils.js";
import { motion } from 'lite-sleek';
import { useLightbox } from '#lib/lightbox/index.js';
import { useFilters } from '#src/features/filters/index.js';
import { usePermission } from '#src/hooks/core/auth/usePermission.js';
import { useUI } from '#lib/store/index.js';
import { LightboxSlide } from '#lib/lightbox/types.js';
import { Photo } from '#src/types/photo.js';
import { usePhoto } from '#src/hooks/index.js';
import { Icon } from '#src/components/ui/Icon.js';

// Components
import { LightboxStage } from './components/LightboxStage.js';
import { LightboxThumbnails } from './components/LightboxThumbnails.js';
import { LightboxHeader } from './components/LightboxHeader.js';
import { LightboxInfo } from './components/LightboxInfo.js';

interface PhotoLightboxProps {
  photos?: (Photo | { original: Photo } | LightboxSlide)[];
  initialIndex?: number;
  isOpen?: boolean;
  onClose?: () => void;
  onEdit?: (photo: Photo) => void;
}

export function PhotoLightbox(props: Partial<PhotoLightboxProps>) {
  const { 
    isOpen: hookIsOpen, 
    isEditing,
    slides: hookSlides, 
    currentIndex: hookIndex, 
    close: hookClose,
    setLightboxIndex,
    next: hookNext,
    prev: hookPrev
  } = useLightbox();
  
  // Prioritize hookSlides (from store) if present, otherwise fallback to props
  const sourcePhotos = (hookSlides && hookSlides.length > 0) ? hookSlides : (props.photos && props.photos.length > 0 ? props.photos : []);
  const currentIndex = props.initialIndex ?? hookIndex;
  const isOpen = props.isOpen ?? hookIsOpen;
  const onClose = props.onClose || hookClose;
  const { setPhotoId, setModal, photoId: queryPhotoId } = useFilters();
  const currentDescLang = useUI(s => s.descLang);
  const patch = useUI(s => s.patch);
  
  // Auto-fetch photo if we are deep-linked but have no slides loaded
  const needsDeepLinkFetch = isOpen && sourcePhotos.length === 0 && !!queryPhotoId;
  const { data: deepLinkPhoto, isLoading: isDeepLinkLoading } = usePhoto(needsDeepLinkFetch ? queryPhotoId : null);
  
  const finalSourcePhotos = useMemo(() => {
    if (sourcePhotos.length > 0) return sourcePhotos;
    if (deepLinkPhoto) return [deepLinkPhoto];
    return [];
  }, [sourcePhotos, deepLinkPhoto]);

  const onEdit = props.onEdit || ((photo: Photo) => {
    setPhotoId(photo.id);
    setModal('edit');
  });

  const [showInfo, setShowInfo] = useState(false);
  const lang = currentDescLang;

  const handleLangChange = (newLang: 'zh' | 'en' | 'ms') => {
    try {
        patch({ descLang: newLang });
    } catch (e) {
        ErrorFactory.handleError(e, 'Failed to change language');
    }
  };
  const normalizeSlide = (slide: Photo | { original: Photo } | LightboxSlide): Photo | { original: Photo } => {
    if (slide && typeof slide === 'object') {
        if ('original' in slide) return slide as { original: Photo };
        if ('imageUrl' in slide || 'image_url' in slide || 'id' in slide) return slide as Photo;
        
        // Fallback for LightboxSlide
        return {
          id: (slide as LightboxSlide).id,
          storageId: (slide as LightboxSlide).id,
          itemCode: (slide as LightboxSlide).itemCode || '',
          manualCode: '',
          modelNumber: '',
          imageHash: '',
          name: (slide as LightboxSlide).title || '',
          categoryId: null,
          manufacturerId: null,
          description: { zh: (slide as LightboxSlide).description || '', en: (slide as LightboxSlide).description || '' },
          imageUrl: (slide as LightboxSlide).src,
          thumbnailSmUrl: (slide as LightboxSlide).src,
          thumbnailMdUrl: (slide as LightboxSlide).src,
          exifData: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          groupId: null,
          group: null,
          isGroupCover: false,
          isHidden: false,
          isPinned: false,
          isAnalyzing: false,
          groupOrder: 0,
          userId: '',
          uri: (slide as LightboxSlide).src,
          price: (slide as LightboxSlide).price || '',
          tags: [],
          dimensions: [],
          categoryName: '',
          manufacturerName: ''
        };
    }
    return slide as Photo;
  };

  const effectivePhotos = useMemo(() => {
    if (finalSourcePhotos.length === 0 && isOpen) return [];
    return finalSourcePhotos.map(normalizeSlide);
  }, [finalSourcePhotos, isOpen]) as (Photo | { original: Photo })[];

  const handleNext = hookNext;
  const handlePrev = hookPrev;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isEditing) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, handleNext, handlePrev, onClose]);

  const baseActivePhoto = useMemo(() => {
    if (effectivePhotos.length === 0) return null;
    return (effectivePhotos[currentIndex] || effectivePhotos[0]) as Photo | { original: Photo };
  }, [effectivePhotos, currentIndex]);

  const activeId = useMemo(() => {
    if (!baseActivePhoto) return null;
    return ('original' in baseActivePhoto)
       ? (baseActivePhoto as { original: Photo }).original.id
       : (baseActivePhoto as Photo).id;
  }, [baseActivePhoto]);

  const { data: activePhotoDetails } = usePhoto((isOpen && !isDeepLinkLoading && activeId) ? activeId : null);

  const handleSelect = useCallback((idx: number) => {
    setLightboxIndex(idx);
    const photoItem = effectivePhotos[idx];
    if (!photoItem) return;
    const photoData = ('original' in photoItem ? photoItem.original : photoItem) as Photo;
    if (photoData.id) setPhotoId(photoData.id);
  }, [effectivePhotos, setLightboxIndex, setPhotoId]);

  if (!isOpen) return null;
  
  if (isDeepLinkLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col font-sans select-none items-center justify-center">
        <motion.div 
           initial={{ opacity: 0 }} 
           animate={{ opacity: 1 }} 
           exit={{ opacity: 0 }} 
           transition="medium"
          className="absolute inset-0 bg-black/98 z-[110]"
         />
        <div className="relative z-[120] text-white opacity-70 flex flex-col items-center gap-4">
          <Icon name="loader-2" className="animate-spin" size={32} />
          <span>載入中...</span>
        </div>
      </div>
    );
  }

  if (effectivePhotos.length === 0) return null;
  
  if (!baseActivePhoto) return null;
  
  const activePhoto = activePhotoDetails || (('original' in baseActivePhoto)
     ? (baseActivePhoto as { original: Photo }).original
     : (baseActivePhoto as Photo));

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[100] flex flex-col font-sans select-none transition-opacity duration-300",
        "opacity-100 pointer-events-auto"
      )}
    >
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
          onToggleInfo={() => setShowInfo(!showInfo)}
          onEdit={onEdit}
          onClose={onClose}
        />

        {/* Info Panel */}
        <LightboxInfo
          key={lang}
          currentPhoto={activePhoto}
          showInfo={showInfo}
          lang={lang}
          onLangChange={handleLangChange}
        />

        {/* Main Stage */}
        <LightboxStage />

        {/* Thumbnails */}
        <LightboxThumbnails
          photos={effectivePhotos}
          currentIndex={currentIndex}
          isOpen={isOpen}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
