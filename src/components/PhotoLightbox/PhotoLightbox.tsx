import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Photo, Category, Manufacturer, TranslationType } from '../../types';
import { usePhotoLightboxLogic } from './usePhotoLightboxLogic';
import { LightboxImageSection } from './LightboxImageSection';
import { LightboxInfoPanel } from './LightboxInfoPanel';
import { useQueryClient } from '@tanstack/react-query';

import { useAdminMode, usePermission, useTasks } from '../../hooks';
import { useGalleryStore, useShallow } from '../../store';
import { translations } from '../../lib/translations';
import { useCategoriesQuery, useManufacturersQuery, useTagsQuery } from '../../hooks';
import { usePhotoActions } from '../../contexts/PhotoActionsContext';

export interface PhotoLightboxProps {
  photo: Photo | null;
  displayPhotos: Photo[];
  index: number | null;
  onClose: () => void;
  onPrev: (e?: React.MouseEvent) => void;
  onNext: (e?: React.MouseEvent) => void;
  contactWhatsApp: (photo: Photo) => void;
  onUngroup?: (photoId: string) => void;
  onSetGroupCover?: (photoId: string, groupId: string) => void;
  onEditPhoto?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = (props) => {
  const {
    photo, index: propIndex, onClose, onPrev, onNext,
    contactWhatsApp, displayPhotos: rawDisplayPhotos
  } = props;
  const displayPhotos = rawDisplayPhotos ?? [];

  const actions = usePhotoActions();
  const { tasks } = useTasks();
  const storeIsAnalyzing = React.useMemo(() => tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析'))), [tasks]);

  const onEditPhoto = props.onEditPhoto ?? actions.onEditPhoto;
  const onToggleHidden = props.onToggleHidden ?? actions.onToggleHidden;
  const onTogglePinned = props.onTogglePinned ?? actions.onTogglePinned;
  const onAiAnalyze = props.onAiAnalyze ?? actions.onAiAnalyze;
  const onCancelAnalyze = props.onCancelAnalyze ?? actions.onCancelAnalyze;
  const onUngroup = props.onUngroup ?? actions.onUngroup;
  const onSetGroupCover = props.onSetGroupCover ?? actions.onSetGroupCover;
  const isAnalyzing = props.isAnalyzing ?? storeIsAnalyzing;

  const { data: categories = [] } = useCategoriesQuery();
  const { data: qManufacturers = [] } = useManufacturersQuery();
  const { data: contextTags = [] } = useTagsQuery();
  const manufacturers = qManufacturers;
  
  const tagMap = React.useMemo(() => {
    const map: Record<string, string> = { };
    contextTags.forEach(t => { map[String(t.id)] = t.name; });
    return map;
  }, [contextTags]);

  const lang = useGalleryStore(s => s.appLang);
  const isAdminMode = useAdminMode();
  const t = React.useMemo(() => translations[lang] || translations['zh'], [lang]);

  // Resolve correct current index using photo.id to prevent mismatched indexing issues
  const index = React.useMemo(() => {
    if (!photo) return null;
    const foundIndex = displayPhotos.findIndex((p) => p.id === photo.id);
    return foundIndex !== -1 ? foundIndex : propIndex;
  }, [photo, displayPhotos, propIndex]);

  const { isAdmin } = usePermission();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (index !== null) {
      const preloadNeighbors = (idx: number, range: number) => {
        const start = Math.max(0, idx - range);
        const end = Math.min(displayPhotos.length - 1, idx + range);
        
        for (let i = start; i <= end; i++) {
          const photo = displayPhotos[i];
          if (photo?.image_url) {
            const img = new Image();
            img.src = photo.image_url;
          }
        }
      };
      preloadNeighbors(index, 5);
    }
  }, [index]); // Removed displayPhotos and queryClient from dependencies to prevent infinite re-renders

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
          isAdminMode={isAdminMode}
          isCopied={isCopied}
          isAnalyzing={isAnalyzing}
          t={t}
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
};
