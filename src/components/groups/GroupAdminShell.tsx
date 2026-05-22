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
import { updatePhotosGroupInCloud } from '../../services/photoMutationService';
import { getGroupById, saveGroupToCloud } from '../../services/groupService';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupSettingsSheet } from './GroupSettingsSheet';
import { GroupHeader } from './GroupHeader';
import { GroupMultiSelectBar } from './GroupMultiSelectBar';
import { useGroupAdminLogic } from './useGroupAdminLogic';
import { GroupGridView } from './GroupGridView';

import { useAdminMode } from '../../hooks/useAdminMode';

export interface GroupAdminShellProps {
  activeGroupId: string | null;
  initialPhotoId?: string | null;
  setActiveGroupId: (id: string | null) => void;
  photos: Photo[];
  onBatchEdit?: (ids: string[]) => void;
  onUngroup?: (groupId: string) => void;
  onAddPhotoToGroup?: () => void;
  updateGroupPhotos?: (ids: string[], groupId: string | null) => void;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
  onBatchAiAnalyze?: (photos: Photo[]) => void;
  onRefresh?: () => void;
  manufacturers?: Manufacturer[];
  isStaffMode?: boolean;
  contactWhatsApp?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  lang?: string;
  t?: TranslationType;
  categories?: Category[];
  tagMap?: Record<string, string>;
  allTags?: Tag[];
  updatePhoto?: (id: string, updates: Partial<Photo>) => Promise<void>;
  onEditPhoto?: (photo: Photo) => void;
}

import { useGroupCoverMutation } from '../../hooks/mutations/useGroupCoverMutation';
import { useGalleryStore } from '../../store';
import { useFeedback } from '../../hooks';

import { DimensionEditor } from '../admin/edit/DimensionEditor';

export const GroupAdminShell: React.FC<GroupAdminShellProps> = (props) => {
  const { showError } = useFeedback();
  const isAdminMode = useAdminMode();
  const {
    activeGroupId, setActiveGroupId, photos,
    onBatchEdit, onUngroup, onAddPhotoToGroup,
    updateGroupPhotos, onAiAnalyze, onCancelAnalyze, isAnalyzing, onBatchAiAnalyze,
    onRefresh,
    manufacturers = [],
    isStaffMode = false,
    contactWhatsApp = () => {},
    onToggleHidden = () => {},
    lang = 'en',
    t, categories, tagMap, allTags = [],
    updatePhoto: hookUpdatePhoto,
    onEditPhoto
  } = props;

  const {
    activeGroupPhotos,
    focusedGroupPhotoId, setFocusedGroupPhotoId,
    draggedPhotoId, setDraggedPhotoId,
    showGroupSettings, groupSettingsOpen, setGroupSettingsOpen,
    batchEditingIds, setBatchEditingIds,
    batchAiAnalyzeTrigger, setBatchAiAnalyzeTrigger,
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
    isGroupPhotosLoading
  } = useGroupAdminLogic({
    activeGroupId,
    initialPhotoId: props.initialPhotoId,
    photos,
    hookUpdatePhoto,
    onRefresh: onRefresh || (() => {}),
    onUngroup,
    setActiveGroupId
  });

  // Watch for batch triggers
  useEffect(() => {
    if (batchAiAnalyzeTrigger) {
      if (onBatchAiAnalyze) {
         onBatchAiAnalyze(activeGroupPhotos);
      }
      setBatchAiAnalyzeTrigger(false);
    }
  }, [batchAiAnalyzeTrigger, activeGroupPhotos, onBatchAiAnalyze, setBatchAiAnalyzeTrigger]);

  useEffect(() => {
    if (batchEditingIds) {
      if (onBatchEdit) {
        onBatchEdit(batchEditingIds);
      }
      setBatchEditingIds(null);
    }
  }, [batchEditingIds, onBatchEdit, setBatchEditingIds]);

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
             handleBulkAction={handleBulkAction}
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
                      t={t}
                      lang={lang}
                      categories={categories || []}
                      manufacturers={manufacturers}
                      tagMap={tagMap || {}}
                      isStaffMode={isStaffMode}
                      contactWhatsApp={contactWhatsApp}
                      onUngroup={handleUngroupLightbox}
                      onSetGroupCover={handleSetGroupCoverLightbox}
                      onEditPhoto={(p) => {
                        onEditPhoto?.(p);
                      }}
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
