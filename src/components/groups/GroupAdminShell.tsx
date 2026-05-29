import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Photo } from '../../types';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupSettingsSheet } from './GroupSettingsSheet';
import { GroupDetailSkeleton } from './GroupDetailSkeleton';
import { GroupHeader } from './GroupHeader';
import { GroupMultiSelectBar } from './GroupMultiSelectBar';
import { useGroupAdminLogic } from './useGroupAdminLogic';
import { GroupGridView } from './GroupGridView';
import { GroupPhotoPicker } from './GroupPhotoPicker';

import { useAdminMode } from '@/hooks';
import { useAdmin } from '@/features/admin/useAdmin';
import { translations } from '../../lib/translations';
import { usePhotoActions } from '@/features/admin/useAdmin';

export interface GroupAdminShellProps {
  initialPhotoId?: string | null;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export const GroupAdminShell: React.FC<GroupAdminShellProps> = (props) => {
  const { 
    onAiAnalyze, onCancelAnalyze, isAnalyzing,
  } = props;
  const isAdminMode = useAdminMode();
  const adminLogic = useAdmin();
  const {
     activeGroupId, setActiveGroupId, appLang,
     setEditPhotoId,
     analyzeGroupById,
     handleAddToGroup,
     isPhotoPickerOpen, setIsPhotoPickerOpen,
     photoPickerGroupId
  } = adminLogic;
  
  const { onUngroup, onEditPhoto: storeEditPhoto } = usePhotoActions();

  const {
    activeGroupPhotos,
    focusedGroupPhotoId, setFocusedGroupPhotoId,
    draggedPhotoId, setDraggedPhotoId,
    groupSettingsOpen, setGroupSettingsOpen,
    groupData, setGroupData,
    isGroupDataLoading,
    containerRef,
    virtuosoRef,
    currentHighlightId,
    handleScroll,
    confirmBulkRemove,
    persistPhotoChange,
    handleUpdateGroupData,
    handleBatchUpdateDimensions,
    handleReorder,
    isMultiSelect, setIsMultiSelect,
    setSelectedIds,
    setCover,
    setPromptDialog,
    setAlertDialog,
    isGroupPhotosLoading,
    handleBulkAction: hookHandleBulkAction
  } = useGroupAdminLogic({
    initialPhotoId: props.initialPhotoId
  });

  const translate = translations[appLang as keyof typeof translations as keyof typeof translations] || translations.en;

  const isLoading = isGroupPhotosLoading || isGroupDataLoading;

  const dragState = React.useRef({ draggedPhotoId, handleReorder, isAdminMode, isMultiSelect });
  React.useEffect(() => {
    dragState.current = { draggedPhotoId, handleReorder, isAdminMode, isMultiSelect };
  }, [draggedPhotoId, handleReorder, isAdminMode, isMultiSelect]);

  const stableGetPhotoProps = useCallback((photo: Photo) => ({
    draggable: dragState.current.isAdminMode && !dragState.current.isMultiSelect,
    onDragStart: () => setDraggedPhotoId(photo.id),
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const currentDraggedId = dragState.current.draggedPhotoId;
      if (currentDraggedId) {
        dragState.current.handleReorder(currentDraggedId, photo.id);
        setDraggedPhotoId(null);
      }
    }
  }), [setDraggedPhotoId]);

  const handleEditPhoto = useCallback((p: Photo) => {
    if (storeEditPhoto) {
       storeEditPhoto(p);
    } else {
       setEditPhotoId(p.id);
    }
  }, [storeEditPhoto, setEditPhotoId]);

  const handlePhotoClick = useCallback((photo: Photo) => {
    if (isMultiSelect) {
      setSelectedIds(prev => 
        prev.includes(photo.id) ? prev.filter(id => id !== photo.id) : [...prev, photo.id]
      );
    } else {
      setFocusedGroupPhotoId(photo.id);
    }
  }, [isMultiSelect, setSelectedIds, setFocusedGroupPhotoId]);

  const handlePhotoContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent, photo: Photo) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isAdminMode) {
      setIsMultiSelect(true);
      setSelectedIds([photo.id]);
      if ('vibrate' in navigator) navigator.vibrate(50);
    }
  }, [isAdminMode, setIsMultiSelect, setSelectedIds]);

  const handleCloseLightbox = useCallback(() => setFocusedGroupPhotoId(null), [setFocusedGroupPhotoId]);

  const handlePrevLightbox = useCallback((idx: number) => {
    const prev = idx > 0 ? idx - 1 : activeGroupPhotos.length - 1;
    if (activeGroupPhotos.length > 0) setFocusedGroupPhotoId(activeGroupPhotos[prev].id);
  }, [activeGroupPhotos, setFocusedGroupPhotoId]);

  const handleNextLightbox = useCallback((idx: number) => {
    const next = idx < activeGroupPhotos.length - 1 ? idx + 1 : 0;
    if (activeGroupPhotos.length > 0) setFocusedGroupPhotoId(activeGroupPhotos[next].id);
  }, [activeGroupPhotos, setFocusedGroupPhotoId]);

  const handleUngroupLightbox = useCallback((photoId: string) => {
    confirmBulkRemove([photoId]);
    setFocusedGroupPhotoId(null);
  }, [confirmBulkRemove, setFocusedGroupPhotoId]);

  const handleSetGroupCoverLightbox = useCallback((photoId: string) => setCover(photoId), [setCover]);

  const handleToggleHiddenLightbox = useCallback((p: Photo) => {
    const newStatus = !p.is_hidden;
    persistPhotoChange(p.id, { is_hidden: newStatus });
  }, [persistPhotoChange]);

  return (
    <>
      <AnimatePresence mode="wait">
        {activeGroupId !== null && (
          <motion.div 
            key={activeGroupId}
            ref={containerRef}
            onScroll={handleScroll}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-brand-bg overflow-hidden pt-safe flex flex-col"
          >
            {isLoading && activeGroupPhotos.length === 0 ? (
              <GroupDetailSkeleton />
            ) : (
              <>
                {/* Top Header */}
                <GroupHeader 
                  activeGroupId={activeGroupId}
                  setActiveGroupId={setActiveGroupId}
                  isAdminMode={isAdminMode}
                  groupData={groupData}
                  isGroupDataLoading={isGroupDataLoading}
                  activeGroupPhotos={activeGroupPhotos}
                  onBatchAiAnalyzeByGroupId={analyzeGroupById}
                />

                <GroupGridView 
                  key={activeGroupId}
                  virtuosoRef={virtuosoRef}
                  photos={activeGroupPhotos}
                  isLoading={isGroupPhotosLoading}
                  highlightId={currentHighlightId}
                  onPhotoClick={handlePhotoClick}
                  onPhotoContextMenu={handlePhotoContextMenu}
                  getPhotoProps={stableGetPhotoProps}
                />
              </>
            )}

            {/* Multi-Select Floating Bar */}
            <GroupMultiSelectBar 
              activeGroupPhotos={activeGroupPhotos}
              handleBulkAction={hookHandleBulkAction}
            />

            {/* Photo Picker for adding photos to group */}
            <GroupPhotoPicker 
              isOpen={!!isPhotoPickerOpen}
              onClose={() => setIsPhotoPickerOpen(false)}
              groupId={activeGroupId || ''}
              onAdd={async (ids) => {
                if (activeGroupId) {
                  await handleAddToGroup(ids, activeGroupId);
                }
              }}
            />

            {/* Group Settings Sheet */}
            <GroupSettingsSheet 
              showGroupSettings={groupSettingsOpen}
              setShowGroupSettings={setGroupSettingsOpen}
              activeGroupId={activeGroupId}
              groupData={groupData}
              setGroupData={setGroupData}
              onUngroup={onUngroup}
              setActiveGroupId={setActiveGroupId}
              handleUpdateGroupData={handleUpdateGroupData}
              handleBatchUpdateDimensions={handleBatchUpdateDimensions}
              setAlertDialog={setAlertDialog}
              setPromptDialog={setPromptDialog}
              t={translate}
            />

            {/* Unified Photo Lightbox */}
            <AnimatePresence>
              {focusedGroupPhotoId && (() => {
                  const currentIndex = activeGroupPhotos.findIndex(p => p.id === focusedGroupPhotoId);
                  const photo = activeGroupPhotos[currentIndex];
                  if (!photo) return null;

                  return (
                     <PhotoLightbox 
                       photo={photo}
                       displayPhotos={activeGroupPhotos}
                       index={currentIndex}
                       onClose={handleCloseLightbox}
                       onPrev={() => handlePrevLightbox(currentIndex)}
                       onNext={() => handleNextLightbox(currentIndex)}
                       contactWhatsApp={() => {}}
                       onUngroup={handleUngroupLightbox}
                       onSetGroupCover={handleSetGroupCoverLightbox}
                       onEditPhoto={handleEditPhoto}
                       onToggleHidden={handleToggleHiddenLightbox}
                       onAiAnalyze={onAiAnalyze}
                       onCancelAnalyze={onCancelAnalyze}
                       isAnalyzing={isAnalyzing}
                     />
                  );
              })()}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
