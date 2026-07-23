import { useAtomValue } from 'jotai';
import { descLangAtom } from '#src/store/index.js';
import { patch } from '#lib/store/index.js';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { cn } from "#lib/utils.js";
import { motion } from 'lite-sleek';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';
import { useFilters } from '#src/features/filters/index.js';
import { useAppQuery } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { LightboxSlide } from '#lib/lightbox/types.js';
import { Photo } from '#src/types/photo.js';
import { usePhoto, useAdminMode } from '#src/hooks/index.js';
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

/**
 * PhotoLightbox
 * 
 * 照片燈箱組件，支持全屏瀏覽、縮略圖導航、信息展示與 AI 屬性編輯。
 */
export function PhotoLightbox(props: Partial<PhotoLightboxProps>) {
  const { 
    isOpen: hookIsOpen, 
    isEditing,
    slides: hookSlides, 
    currentIndex: hookIndex, 
    close: hookClose,
    setLightboxIndex,
    setLightboxData,
    next: hookNext,
    prev: hookPrev
  } = useLightbox();
  
  // Prioritize hookSlides (from store) if present, otherwise fallback to props
  const sourcePhotos = (hookSlides && hookSlides.length > 0) ? hookSlides : (props.photos && props.photos.length > 0 ? props.photos : []);
  const currentIndex = props.initialIndex ?? hookIndex;
  const isOpen = props.isOpen ?? hookIsOpen;
  const onClose = props.onClose || hookClose;
  
  const { setPhotoId, setModal, photoId: queryPhotoId } = useFilters();
  const currentDescLang = useAtomValue(descLangAtom);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleShowFeedback = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setLocalToast({ message, type });
  }, []);

  useEffect(() => {
    if (localToast) {
      const timer = setTimeout(() => {
        setLocalToast(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [localToast]);

  // Native <dialog> visibility and body overflow locking
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (isOpen && !isEditing) {
      if (!el.open) {
        try {
          el.showModal();
          document.body.style.overflow = 'hidden';
        } catch (e) {
          el.setAttribute('open', '');
          document.body.style.overflow = 'hidden';
        }
      }
    } else {
      if (el.open) {
        try {
          el.close();
        } catch (e) {}
      }
      const activeDialogs = document.querySelectorAll('dialog[open]');
      if (activeDialogs.length === 0) {
        document.body.style.overflow = '';
      }
    }

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    el.addEventListener('cancel', handleCancel);

    return () => {
      el.removeEventListener('cancel', handleCancel);
      const activeDialogs = document.querySelectorAll('dialog[open]');
      if (activeDialogs.length <= 1) { // includes this one before closing
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, isEditing, onClose]);
  

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
  const [showControls, setShowControls] = useState(true);
  const lang = currentDescLang;

  const handleStageTap = useCallback(() => {
    if (showInfo) {
      setShowInfo(false);
    } else {
      setShowControls(prev => !prev);
    }
  }, [showInfo]);

  const handleLangChange = (newLang: 'zh' | 'en' | 'ms') => {
    try {
        patch({ descLang: newLang });
    } catch (e) {
        ErrorFactory.handle(e as Error, { context: 'Failed to change language' });
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
          description: { zh: (slide as LightboxSlide).description || '', en: (slide as LightboxSlide).description || '', ms: '' },
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
      if (e.key === 'Escape') {
        if (showInfo) {
          setShowInfo(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, showInfo, handleNext, handlePrev, onClose]);

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

  const activePhoto = useMemo(() => {
    return activePhotoDetails || (baseActivePhoto ? (('original' in baseActivePhoto)
       ? (baseActivePhoto as { original: Photo }).original
       : (baseActivePhoto as Photo)) : null);
  }, [activePhotoDetails, baseActivePhoto]);

  // If we open a single photo that belongs to a group (like a deep-link),
  // dynamically fetch all group photos and expand the slides!
  const isAdminMode = useAdminMode();
  const groupPhotosQueryEnabled = !!(isOpen && sourcePhotos.length <= 1 && activePhoto?.groupId);
  const { data: groupPhotos = [] } = useAppQuery<any[]>(
    groupPhotosQueryEnabled ? ['photos', 'group-expand', activePhoto?.groupId] : null,
    async () => {
      if (!activePhoto?.groupId) return [];
      const response = await api.photos.list.$post({
        json: {
          groupId: activePhoto.groupId,
          onlyGroupsCover: false,
          limit: 100,
          isAdminMode: isAdminMode
        }
      });
      const jsonRes = await response.json();
      if (jsonRes.success && jsonRes.data) {
        return jsonRes.data.items || [];
      }
      return [];
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  useEffect(() => {
    if (isOpen && sourcePhotos.length <= 1 && activePhoto?.groupId && groupPhotos.length > 1) {
      // Make sure the group's photos are in the correct groupOrder
      const sortedGroupPhotos = [...groupPhotos].sort((a, b) => {
        const orderA = a.groupOrder ?? 0;
        const orderB = b.groupOrder ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const groupSlides = photosToLightboxSlides(sortedGroupPhotos);
      setLightboxData(groupSlides);
      const newIndex = sortedGroupPhotos.findIndex(p => p.id === activePhoto.id);
      if (newIndex !== -1) {
        setLightboxIndex(newIndex);
      }
    }
  }, [isOpen, sourcePhotos.length, activePhoto?.groupId, groupPhotos, activePhoto?.id, setLightboxData, setLightboxIndex]);

  if (!isOpen || isEditing) return null;

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed inset-0 w-screen h-screen max-w-none max-h-none outline-none border-none overflow-hidden m-0 p-0 font-sans select-none bg-black/95",
        "animate-in fade-in duration-200 ease-out"
      )}
    >
      {isDeepLinkLoading ? (
        <div className="relative text-white opacity-70 flex flex-col items-center justify-center w-full h-full gap-4">
          <Icon name="loader-2" className="animate-spin" size={32} />
          <span>載入中...</span>
        </div>
      ) : (
        <div className="relative flex flex-col w-full h-full">
          {/* Main Stage */}
          <LightboxStage onTap={handleStageTap} />

          {activePhoto && (
            <>
              {/* Header Controls */}
              <LightboxHeader
                currentPhoto={activePhoto}
                currentIndex={currentIndex}
                totalPhotos={effectivePhotos.length}
                showInfo={showInfo}
                showControls={showControls}
                onToggleInfo={() => setShowInfo(!showInfo)}
                onEdit={onEdit}
                onClose={onClose}
                onShowFeedback={handleShowFeedback}
              />

              {/* Info Panel */}
              <LightboxInfo
                key={lang}
                lang={lang}
                onLangChange={handleLangChange}
                showInfo={showInfo}
                currentPhoto={activePhoto}
                onShowFeedback={handleShowFeedback}
              />
            </>
          )}

          {/* Thumbnails */}
          <LightboxThumbnails
            photos={effectivePhotos}
            isOpen={isOpen}
            showControls={showControls}
            onSelect={handleSelect}
            currentIndex={currentIndex}
          />

          {/* Local HUD Toast (Visible above native <dialog> top layer) */}
          {localToast && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className={cn(
                "px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 border select-none bg-black/90 text-white/90 border-white/10"
              )}>
                <Icon name={localToast.type === 'success' ? 'check' : 'alert-circle'} className={cn("w-3.5 h-3.5 shrink-0", localToast.type === 'success' ? 'text-emerald-400' : 'text-rose-400')} />
                <span>{localToast.message}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
