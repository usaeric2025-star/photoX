import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Photo, Category, Manufacturer, TranslationType } from '../../types';
import { usePhotoLightboxLogic } from './usePhotoLightboxLogic';
import { LightboxImageSection } from './LightboxImageSection';
import { LightboxInfoPanel } from './LightboxInfoPanel';
import { useQueryClient } from '@tanstack/react-query';

import { usePermission } from '../../hooks/usePermission';

export interface PhotoLightboxProps {
  photo: Photo | null;
  displayPhotos: Photo[];
  index: number | null;
  onClose: () => void;
  onPrev: (e?: React.MouseEvent) => void;
  onNext: (e?: React.MouseEvent) => void;
  t: TranslationType;
  lang: string;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  isStaffMode: boolean;
  contactWhatsApp: (photo: Photo) => void;
  onUngroup?: (photoId: string) => void;
  onSetGroupCover?: (photoId: string, groupId: string) => void;
  onEditPhoto?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = (props) => {
  const {
    photo, index, onClose, onPrev, onNext, t, lang, categories, manufacturers, tagMap,
    isStaffMode, contactWhatsApp, onUngroup, onSetGroupCover, onEditPhoto,
    onToggleHidden, onAiAnalyze, onCancelAnalyze, isAnalyzing, displayPhotos
  } = props;

  const { isAdmin } = usePermission();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (index !== null) {
      const preloadNeighbors = (index: number, range: number) => {
        const start = Math.max(0, index - range);
        const end = Math.min(displayPhotos.length - 1, index + range);
        
        for (let i = start; i <= end; i++) {
          const photo = displayPhotos[i];
          if (photo?.image_url) {
            queryClient.prefetchQuery({
              queryKey: ['photo', photo.id],
              queryFn: () => fetch(photo.image_url!).catch(() => null),
            });
          }
        }
      };
      preloadNeighbors(index, 5);
    }
  }, [index, displayPhotos, queryClient]);

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
    retryImageLoad
  } = usePhotoLightboxLogic({
    photo, displayPhotos, index, lang, onPrev, onNext, onClose
  });

  if (index === null || !photo) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[500] bg-brand-bg flex ${isZoomed ? 'flex-col' : 'flex-col md:flex-row'} overflow-hidden`}
    >
      <LightboxImageSection 
        photo={photo}
        index={index}
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
        t={t}
        retryImageLoad={retryImageLoad}
      />

      {!isZoomed && (
        <LightboxInfoPanel 
          photo={photo}
          groupData={groupData}
          isGroupDataLoading={isGroupDataLoading}
          activeLang={activeLang}
          setActiveLang={setActiveLang}
          isStaffMode={isStaffMode}
          isCopied={isCopied}
          isAnalyzing={isAnalyzing}
          t={t}
          categories={categories}
          manufacturers={manufacturers}
          tagMap={tagMap}
          handleShare={handleShare}
          onAiAnalyze={isAdmin ? onAiAnalyze : undefined}
          onCancelAnalyze={onCancelAnalyze}
          onEditPhoto={isAdmin ? onEditPhoto : undefined}
          onToggleHidden={isAdmin ? onToggleHidden : undefined}
          onUngroup={isAdmin ? onUngroup : undefined}
          onSetGroupCover={isAdmin ? onSetGroupCover : undefined}
          contactWhatsApp={contactWhatsApp}
        />
      )}
    </motion.div>
  );
};
