import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Edit3, Settings2, Plus, ChevronLeft, ChevronRight, ChevronDown, Layers, Pencil, Sparkles, 
  Star, ArrowLeft, ArrowRight, MoreVertical, Trash2, Check, 
  Maximize, MessageSquare, Type, Save, Trash, AlertCircle, Tag as TagIcon, Eye, EyeOff
} from 'lucide-react';
import { Photo, Tag, Category, ProductGroup, Manufacturer, Dimension, DialogData } from '../../types';
import { TranslationType } from '../../lib/ui-helpers';
import { Skeleton } from '../ui/Skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { updatePhotosGroupInCloud } from '../../services/photoService';
import { getGroupById, saveGroupToCloud } from '../../services/groupService';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupSettingsSheet } from './GroupSettingsSheet';
import { GroupHeader } from './GroupHeader';
import { GroupMultiSelectBar } from './GroupMultiSelectBar';
import { useGroupAdminLogic } from './useGroupAdminLogic';
import { GroupGridView } from './GroupGridView';

import { useAdminMode } from '../../hooks/useAdminMode';

import { useGalleryStore } from '../../store';
import { useFeedback } from '../../hooks';
import { translations } from '../../lib/translations';

import { 
  useInfinitePhotos, useCategoriesQuery, useManufacturersQuery 
} from '../../hooks';
import { cleanPhotos } from '../../lib/filters';
import { PAGINATION } from '../../constants/config';

export interface GroupAdminShellProps {
  initialPhotoId?: string | null;
  onAddPhotoToGroup?: () => void;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export const GroupAdminShell: React.FC<GroupAdminShellProps> = (props) => {
  const { 
    onAddPhotoToGroup, onAiAnalyze, onCancelAnalyze, isAnalyzing,
  } = props;
  const { showError } = useFeedback();
  const isAdminMode = useAdminMode();
  const {
     activeGroupId, setActiveGroupId, appLang,
     tagIdToNameMap, isStaffMode,
     onToggleHidden: storeToggleHidden, onUpdatePhoto, onTogglePinned, onDeletePhoto,
     adminPreviewMode,
     setEditPhotoId,
     filterCatId, filterTagIds, debouncedSearchQuery, sortOrder
  } = useGalleryStore();

  const infinitePhotosQuery = useInfinitePhotos({
    category_id: filterCatId,
    tag_id: Array.isArray(filterTagIds) && filterTagIds.length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery,
    sortOrder: sortOrder,
    isAdminMode: true
  }, PAGINATION.ADMIN_BATCH_SIZE);

  const photos = React.useMemo(() => {
    const allPhotos = infinitePhotosQuery.data?.pages.flatMap(p => p.photos) || [];
    return cleanPhotos(allPhotos);
  }, [infinitePhotosQuery.data]);

  const { data: categories = [] } = useCategoriesQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();

  const { 
    onBatchAiAnalyze, onBatchEdit, onUngroup, 
    onTogglePinned: storeTogglePinned, tagIdToNameMap: tagMap,
    onEditPhoto: storeEditPhoto
  } = useGalleryStore();

  const contactWhatsApp = (photo: Photo) => {
    // Placeholder or implement if needed
  };

  const {
    activeGroupPhotos,
    focusedGroupPhotoId, setFocusedGroupPhotoId,
    draggedPhotoId, setDraggedPhotoId,
    showGroupSettings, groupSettingsOpen, setGroupSettingsOpen,
    batchEditingIds, setBatchEditingIds,
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
    handleBulkAction,
    isMultiSelect, setIsMultiSelect,
    selectedIds, setSelectedIds,
    setCover,
    setPromptDialog,
    setAlertDialog,
    isGroupPhotosLoading,
    handleToggleTag,
    handleBulkAction: hookHandleBulkAction
  } = useGroupAdminLogic({
    initialPhotoId: props.initialPhotoId,
    photos // MUST pass photos here since we pulled it via hook
  });

  const t = translations[appLang as keyof typeof translations] || translations.en;

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

  const handleAddPhotoToGroupClick = useCallback(async () => {
    if (onAddPhotoToGroup) {
      await onAddPhotoToGroup();
    } else {
      console.warn('onAddPhotoToGroup is not defined');
    }
  }, [onAddPhotoToGroup]);

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
            className="fixed inset-0 z-[200] bg-brand-bg overflow-y-auto pt-safe flex flex-col"
          >
           {/* Top Header */}
           <GroupHeader 
             activeGroupId={activeGroupId}
             setActiveGroupId={setActiveGroupId}
             isAdminMode={isAdminMode}
             groupData={groupData}
             isGroupDataLoading={isGroupDataLoading}
             activeGroupPhotos={activeGroupPhotos}
             onAddPhotoToGroup={onAddPhotoToGroup}
           />

           <GroupGridView 
             virtuosoRef={virtuosoRef}
             photos={activeGroupPhotos}
             isLoading={isGroupPhotosLoading}
               highlightId={currentHighlightId}
               onPhotoClick={handlePhotoClick}
               onPhotoContextMenu={handlePhotoContextMenu}
               getPhotoProps={useCallback((photo) => ({
                 draggable: isAdminMode && !isMultiSelect,
                 onDragStart: () => setDraggedPhotoId(photo.id),
                 onDragOver: (e: React.DragEvent) => e.preventDefault(),
                 onDrop: (e: React.DragEvent) => {
                   if (e && typeof e.preventDefault === 'function') e.preventDefault();
                   if (draggedPhotoId) {
                     handleReorder(draggedPhotoId, photo.id);
                     setDraggedPhotoId(null);
                   }
                 }
               }), [isAdminMode, isMultiSelect, draggedPhotoId, handleReorder])}
             />

           {/* Multi-Select Floating Bar */}
           <GroupMultiSelectBar 
             activeGroupPhotos={activeGroupPhotos}
             handleBulkAction={hookHandleBulkAction}
           />

            <div className="p-4 flex justify-center">
              <button 
                onClick={handleAddPhotoToGroupClick} 
                className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                添加照片
              </button>
            </div>

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
              t={t}
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
                      contactWhatsApp={contactWhatsApp}
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
