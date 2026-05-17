import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  X, Edit3, Settings2, Plus, ChevronLeft, ChevronRight, ChevronDown, Layers, Pencil, Sparkles, 
  Star, ArrowLeft, ArrowRight, MoreVertical, Trash2, Check, 
  Maximize, MessageSquare, Type, Save, Trash, AlertCircle, Tag as TagIcon, Eye, EyeOff
} from 'lucide-react';
import { Photo, Tag, Category, ProductGroup, Manufacturer, Dimension } from '../../types';
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

export interface GroupAdminShellProps {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  photos: Photo[];
  isAdminMode: boolean;
  onEditPhoto?: (photo: Photo) => void;
  onBatchEdit?: (ids: string[]) => void;
  onUngroup?: (groupId: string) => void;
  onAddPhotoToGroup?: () => void;
  updateGroupPhotos?: (ids: string[], groupId: string | null) => void;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
  onBatchAiAnalyze?: (photos: Photo[]) => void;
  manufacturers?: Manufacturer[];
  isStaffMode?: boolean;
  contactWhatsApp?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  lang?: string;
  t?: TranslationType;
  categories?: Category[];
  tagMap?: Record<string, string>;
  allTags?: Tag[];
  isMultiSelect?: boolean;
  setAlertDialog?: (d: { title: string; message: string; onConfirm: () => void } | null) => void;
  updatePhoto?: (id: string, updates: Partial<Photo>) => Promise<void>;
}

import { useGroupCoverMutation } from '../../hooks/mutations/useGroupCoverMutation';
import { useGalleryStore } from '../../store';

import { DimensionEditor } from '../admin/edit/DimensionEditor';

export const GroupAdminShell: React.FC<GroupAdminShellProps> = (props) => {
  const {
    activeGroupId, setActiveGroupId, photos,
    isAdminMode, onEditPhoto,
    onBatchEdit, onUngroup, onAddPhotoToGroup,
    updateGroupPhotos, onAiAnalyze, onCancelAnalyze, isAnalyzing, onBatchAiAnalyze,
    manufacturers = [],
    isStaffMode = false,
    contactWhatsApp = () => {},
    onToggleHidden = () => {},
    lang = 'zh',
    t, categories, tagMap, allTags = [],
    setAlertDialog: propsSetAlertDialog,
    updatePhoto: hookUpdatePhoto
  } = props;

  const {
    focusedGroupPhotoId, setFocusedGroupPhotoId,
    isMultiSelectMode, setIsMultiSelectMode,
    selectedPhotoIds, setSelectedPhotoIds,
    draggedPhotoId, setDraggedPhotoId,
    showGroupSettings, setShowGroupSettings,
    groupData, setGroupData,
    isGroupDataLoading,
    activeGroupPhotos,
    containerRef,
    handleScroll,
    confirmBulkRemove,
    persistPhotoChange,
    handleUpdateGroupData,
    handleBatchUpdateDimensions,
    handleReorder,
    handleBulkAction,
    setCover,
    setPromptDialog,
    setAlertDialog
  } = useGroupAdminLogic({
    activeGroupId,
    photos,
    isAdminMode,
    hookUpdatePhoto,
    propsSetAlertDialog: propsSetAlertDialog as any,
    onBatchAiAnalyze,
    onBatchEdit
  });

  return (
    <>
      <AnimatePresence mode="wait">
        {activeGroupId !== null && (
          <motion.div 
            ref={containerRef}
            onScroll={handleScroll}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
             onBatchAiAnalyze={onBatchAiAnalyze}
             setShowGroupSettings={setShowGroupSettings}
             onAddPhotoToGroup={onAddPhotoToGroup}
             onBatchEdit={onBatchEdit}
             selectedPhotoIds={selectedPhotoIds}
             setIsMultiSelectMode={setIsMultiSelectMode}
             setSelectedPhotoIds={setSelectedPhotoIds}
           />

           <GroupGridView 
             photos={activeGroupPhotos}
             isMultiSelectMode={isMultiSelectMode}
             selectedPhotoIds={selectedPhotoIds}
             onPhotoClick={(photo) => {
               if (isMultiSelectMode) {
                 setSelectedPhotoIds(prev => 
                   prev.includes(photo.id) ? prev.filter(id => id !== photo.id) : [...prev, photo.id]
                 );
               } else {
                 setFocusedGroupPhotoId(photo.id);
               }
             }}
             onPhotoContextMenu={(e, photo) => {
               if (e && typeof e.preventDefault === 'function') e.preventDefault();
               if (isAdminMode) {
                 setIsMultiSelectMode(true);
                 setSelectedPhotoIds([photo.id]);
                 if ('vibrate' in navigator) navigator.vibrate(50);
               }
             }}
             getPhotoProps={useCallback((photo) => ({
               draggable: isAdminMode && !isMultiSelectMode,
               onDragStart: () => setDraggedPhotoId(photo.id),
               onDragOver: (e: React.DragEvent) => e.preventDefault(),
               onDrop: (e: React.DragEvent) => {
                 if (e && typeof e.preventDefault === 'function') e.preventDefault();
                 if (draggedPhotoId) {
                   handleReorder(draggedPhotoId, photo.id);
                   setDraggedPhotoId(null);
                 }
               }
             }), [isAdminMode, isMultiSelectMode, draggedPhotoId, handleReorder])}
           />

           {/* Multi-Select Floating Bar */}
           <GroupMultiSelectBar 
             isMultiSelectMode={isMultiSelectMode}
             selectedPhotoIds={selectedPhotoIds}
             activeGroupPhotos={activeGroupPhotos}
             handleBulkAction={handleBulkAction}
             setSelectedPhotoIds={setSelectedPhotoIds}
             setIsMultiSelectMode={setIsMultiSelectMode}
           />

            {/* Group Settings Sheet */}
            <GroupSettingsSheet 
              showGroupSettings={showGroupSettings}
              setShowGroupSettings={setShowGroupSettings}
              activeGroupId={activeGroupId}
              groupData={groupData}
              setGroupData={setGroupData}
              isAdminMode={isAdminMode}
              onUngroup={onUngroup}
              setActiveGroupId={setActiveGroupId}
              handleUpdateGroupData={handleUpdateGroupData}
              handleBatchUpdateDimensions={handleBatchUpdateDimensions}
              setAlertDialog={setAlertDialog}
              setPromptDialog={setPromptDialog}
              handleError={handleError}
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
                      onClose={() => setFocusedGroupPhotoId(null)}
                      onPrev={() => {
                        const prev = currentIndex > 0 ? currentIndex - 1 : activeGroupPhotos.length - 1;
                        if (activeGroupPhotos.length > 0) setFocusedGroupPhotoId(activeGroupPhotos[prev].id);
                      }}
                      onNext={() => {
                        const next = currentIndex < activeGroupPhotos.length - 1 ? currentIndex + 1 : 0;
                        if (activeGroupPhotos.length > 0) setFocusedGroupPhotoId(activeGroupPhotos[next].id);
                      }}
                      t={t}
                      lang={lang}
                      categories={categories || []}
                      manufacturers={manufacturers}
                      tagMap={tagMap || {}}
                      isAdminMode={isAdminMode}
                      isStaffMode={isStaffMode}
                      contactWhatsApp={contactWhatsApp}
                      onUngroup={(photoId) => {
                        confirmBulkRemove([photoId]);
                        setFocusedGroupPhotoId(null);
                      }}
                      onSetGroupCover={(photoId, groupId) => setCover(photoId)}
                      onEditPhoto={onEditPhoto}
                      onToggleHidden={(p) => {
                        const newStatus = !p.isHidden;
                        persistPhotoChange(p.id, { isHidden: newStatus });
                      }}
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
