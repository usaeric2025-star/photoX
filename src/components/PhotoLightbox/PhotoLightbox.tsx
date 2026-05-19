import React from 'react';
import { motion } from 'motion/react';
import { Photo, Category, Manufacturer, TranslationType } from '../../types';
import { usePhotoLightboxLogic } from './usePhotoLightboxLogic';
import { LightboxImageSection } from './LightboxImageSection';
import { LightboxInfoPanel } from './LightboxInfoPanel';

import { useAdminMode } from '../../hooks/useAdminMode';

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

  const isAdminMode = useAdminMode();

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
        onEditPhoto={onEditPhoto}
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
          onAiAnalyze={onAiAnalyze}
          onCancelAnalyze={onCancelAnalyze}
          onEditPhoto={onEditPhoto}
          onToggleHidden={onToggleHidden}
          onUngroup={onUngroup}
          onSetGroupCover={onSetGroupCover}
          contactWhatsApp={contactWhatsApp}
        />
      )}
    </motion.div>
  );
};
