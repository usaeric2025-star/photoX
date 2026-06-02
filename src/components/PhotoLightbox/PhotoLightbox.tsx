import { Activity } from 'react';
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { Photo } from '../../types';
import { GalleryVariant } from '@/types/variant';
import { usePhotoLightboxLogic } from './usePhotoLightboxLogic';
import { LightboxImageSection } from './LightboxImageSection';
import { LightboxInfoPanel } from './LightboxInfoPanel';
import { useQueryClient } from '@tanstack/react-query';

import { useAdminMode, usePermission, useTasks, useCategories, useManufacturers, useTags, useFeedback } from '../../hooks';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { createTranslate } from '@/lib/i18n';
import { translations, LanguageCode } from '../../lib/translations';
import { useAdminActions } from '@/features/admin/useAdminActions';

export interface PhotoLightboxProps {
  photoId: string | null;
  displayPhotos: Photo[];
  onClose: () => void;
  onPhotoIdChange: (id: string | null) => void;
  contactWhatsApp?: (photo: Photo) => void;
  onUngroup?: (photoId: string) => void;
  onSetGroupCover?: (photoId: string, groupId: string) => void;
  onEditPhoto?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
  variant?: GalleryVariant;
}

/**
 * [STYLE-AND-A11Y-UPGRADED] PhotoLightbox
 * Integrated with Base UI Dialog for accessibility.
 * LayoutGroup usually handled by parent but motion.div provides local transition.
 */
export function PhotoLightbox(props: PhotoLightboxProps) {
  const {
    photoId, onClose, onPhotoIdChange,
    contactWhatsApp, displayPhotos: rawDisplayPhotos
  } = props;
  const displayPhotos = rawDisplayPhotos ?? [];
  
  const { update: storeUpdate, lang } = useUIStore(useShallow(s => ({ 
    update: s.update,
    lang: s.appLang
  })));

  const index = React.useMemo(() => displayPhotos.findIndex(p => p.id === photoId), [displayPhotos, photoId]);
  const photo = index !== -1 ? displayPhotos[index] : null;
  
  const changePhotoId = React.useCallback((id: string | null) => {
      onPhotoIdChange(id);
  }, [onPhotoIdChange]);
  
  const onPrev = React.useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index > 0) changePhotoId(displayPhotos[index - 1].id);
  }, [index, displayPhotos, changePhotoId]);

  const onNext = React.useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index < displayPhotos.length - 1) changePhotoId(displayPhotos[index + 1].id);
  }, [index, displayPhotos, changePhotoId]);

  const actions = useAdminActions();
  const { tasks } = useTasks();
  const storeIsAnalyzing = React.useMemo(() => tasks.some(task => task.status === 'running' && (task.name.includes('识别') || task.name.includes('分析'))), [tasks]);

  const onEditPhoto = props.onEditPhoto ?? ((p: Photo) => storeUpdate({ editPhotoId: p.id } as any));
  const onToggleHidden = props.onToggleHidden ?? ((p: Photo) => actions.updatePhoto(p.id, { is_hidden: !p.is_hidden }));
  const onTogglePinned = props.onTogglePinned ?? ((p: Photo) => actions.updatePhoto(p.id, { is_pinned: !p.is_pinned }));
  const onAiAnalyze = props.onAiAnalyze ?? ((p: Photo) => {});
  const onCancelAnalyze = props.onCancelAnalyze ?? (() => {});
  const onUngroup = props.onUngroup ?? ((gid: string) => {});
  const onSetGroupCover = props.onSetGroupCover ?? ((id: string, gid: string) => {});
  const isAnalyzing = props.isAnalyzing ?? storeIsAnalyzing;

  const { data: categories = [] } = useCategories();
  const { data: manufacturers = [] } = useManufacturers();
  const { data: contextTags = [] } = useTags();
  
  const tagMap = React.useMemo(() => {
    const map: Record<string, string> = { };
    contextTags.forEach(t => { map[String(t.id)] = t.name; });
    return map;
  }, [contextTags]);

  const isManagement = props.variant === 'full-management' || props.variant === 'staff-workspace';
  const isAdminMode = useAdminMode() && isManagement;
  const translate = React.useMemo(() => (translations[lang as LanguageCode] || translations.en), [lang]);



  const { isAdmin } = usePermission();
  const { showError } = useFeedback();

  const {
    isZoomed, setIsZoomed,
    isImageLoading, setIsImageLoading,
    isImageError, setIsImageError,
    groupData,
    activeLang, setActiveLang,
    isCopied,
    isGroupDataLoading,
    slides,
    handleShare,
    handleDownload,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    retryImageLoad,
    activePhoto
  } = usePhotoLightboxLogic({
    photo, displayPhotos, index, lang, onPrev, onNext, onClose
  });

  useEffect(() => {
    if (index !== null) {
      const preloadNeighbors = (idx: number, range: number) => {
        const start = Math.max(0, idx - range);
        const end = Math.min(displayPhotos.length - 1, idx + range);
        
        for (let i = start; i <= end; i++) {
          const p = displayPhotos[i];
          if (p?.image_url) {
            const img = new Image();
            img.src = p.image_url;
          }
        }
      };
      preloadNeighbors(index, 5);
    }
  }, [index, displayPhotos]);

  // 超时保护
  useEffect(() => {
    if (index === -1) return;
    const timer = setTimeout(() => {
      if (isImageLoading) {
        setIsImageLoading(false);
        showError(new Error('Timeout'), translate.imageLoadFailed || 'Image load failed.');
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isImageLoading, index, showError, translate.imageLoadFailed]);

  const isOpen = index !== null && !!activePhoto;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const DialogBackdrop = Dialog.Backdrop as any;
  const DialogPopup = Dialog.Popup as any;

  return (
    <Activity mode={isOpen ? 'visible' : 'hidden'}>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal keepMounted>
          <Dialog.Backdrop 
            render={(backdropProps) => {
              // Remove incompatible animation props to avoid motion conflict
              const { onAnimationStart: _, onAnimationEnd: __, asChild: ___, ...restBackdropProps } = backdropProps as any;
              return (
                <motion.div 
                  {...restBackdropProps}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[499] bg-black/40 backdrop-blur-md"
                />
              );
            }}
          />
          <Dialog.Popup 
            render={(popupProps) => {
              // Remove asChild and animation props to prevent React/Motion conflict
              const { asChild: _ , onAnimationStart: __, onAnimationEnd: ___, ...restPopupProps } = popupProps as any;
              return (
                <motion.div 
                  {...restPopupProps}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`fixed inset-0 z-[500] bg-brand-bg flex ${isZoomed ? 'flex-col' : 'flex-col md:flex-row'} overflow-hidden focus:outline-none`}
                >
                  {/* Always visible close button */}
                  <button
                    onClick={onClose}
                    className="fixed top-4 right-4 z-[501] w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full text-white flex items-center justify-center transition-all"
                    aria-label={translate.close}
                  >
                    <X size={20} />
                  </button>

                  <LightboxImageSection 
                    photo={activePhoto!}
                    index={index!}
                    isZoomed={isZoomed}
                    setIsZoomed={setIsZoomed}
                    isImageLoading={isImageLoading}
                    setIsImageLoading={setIsImageLoading}
                    isImageError={isImageError}
                    setIsImageError={setIsImageError}
                    slides={slides}
                    onPrev={onPrev}
                    onNext={onNext}
                    onClose={onClose}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onEditPhoto={isAdmin ? onEditPhoto : undefined}
                    handleDownload={handleDownload}
                    t={translate}
                    retryImageLoad={retryImageLoad}
                    isAdminMode={isAdminMode}
                  />

                  {!isZoomed && (
                    <LightboxInfoPanel 
                      photo={activePhoto!}
                      groupData={groupData}
                      isGroupDataLoading={isGroupDataLoading}
                      activeLang={activeLang}
                      setActiveLang={setActiveLang}
                      isAdminMode={isAdminMode}
                      isCopied={isCopied}
                      isAnalyzing={isAnalyzing}
                      t={translate}
                      categories={categories}
                      manufacturers={manufacturers}
                      tagMap={tagMap}
                      handleShare={handleShare}
                      onAiAnalyze={isAdminMode ? onAiAnalyze : undefined}
                      onCancelAnalyze={onCancelAnalyze}
                      onToggleHidden={isAdminMode ? onToggleHidden : undefined}
                      onTogglePinned={isAdminMode ? onTogglePinned : undefined}
                      onUngroup={isAdminMode ? onUngroup : undefined}
                      onSetGroupCover={isAdminMode ? onSetGroupCover : undefined}
                      contactWhatsApp={contactWhatsApp}
                    />
                  )}
                </motion.div>
              );
            }}
          />
        </Dialog.Portal>
      </Dialog.Root>
    </Activity>
  );
};
