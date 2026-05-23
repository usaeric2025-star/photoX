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

import { useAdminMode } from '@/hooks';

import { useGalleryStore, useShallow } from '../../store';
import { useFeedback, useTaskExecutor } from '../../hooks';
import { useQueryClient } from '@tanstack/react-query';
import { translations } from '../../lib/translations';

import { useInfinitePhotos, useCategoriesQuery, useManufacturersQuery } from '../../hooks';
import { usePhotoActions } from '@/contexts/PhotoActionsContext';
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
     setEditPhotoId,
     filterCatId, filterTagIds, debouncedSearchQuery, sortOrder
  } = useGalleryStore(useShallow(s => ({
     activeGroupId: s.activeGroupId,
     setActiveGroupId: s.setActiveGroupId,
     appLang: s.appLang,
     tagIdToNameMap: s.tagIdToNameMap,
     isStaffMode: s.isStaffMode,
     setEditPhotoId: s.setEditPhotoId,
     filterCatId: s.filterCatId,
     filterTagIds: s.filterTagIds,
     debouncedSearchQuery: s.debouncedSearchQuery,
     sortOrder: s.sortOrder
    })));
  
    const { onToggleHidden, onUpdatePhoto, onTogglePinned, onDeletePhoto, onBatchAiAnalyze, onBatchEdit, onUngroup, onEditPhoto: storeEditPhoto } = usePhotoActions();

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

  const queryClient = useQueryClient();
  const { runTask } = useTaskExecutor();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [selectedPhotosToAdd, setSelectedPhotosToAdd] = useState<string[]>([]);
  const [addSearchKeyword, setAddSearchKeyword] = useState('');

  // Sourcing all ungrouped photos
  const ungroupedPhotosQuery = useInfinitePhotos({
    isAdminMode: true
  }, 120);

  const ungroupedPhotos = useMemo(() => {
    const rawList = ungroupedPhotosQuery.data?.pages.flatMap(p => p.photos) || [];
    return cleanPhotos(rawList).filter(p => !p.group_id);
  }, [ungroupedPhotosQuery.data]);

  const filteredUngroupedPhotos = useMemo(() => {
    if (!addSearchKeyword.trim()) return ungroupedPhotos;
    const kw = addSearchKeyword.toLowerCase();
    return ungroupedPhotos.filter(p => 
      (p.name || '').toLowerCase().includes(kw) ||
      (p.item_code || '').toLowerCase().includes(kw) ||
      (p.model_number || '').toLowerCase().includes(kw) ||
      (p.description || '').toLowerCase().includes(kw)
    );
  }, [ungroupedPhotos, addSearchKeyword]);

  const handleConfirmAddPhotos = useCallback(async () => {
    if (selectedPhotosToAdd.length === 0) return;
    await runTask('添加照片到合组 / Add Photos to Group', async () => {
      await updatePhotosGroupInCloud(selectedPhotosToAdd, { group_id: activeGroupId });
      
      // Clear selections and close drawer
      setSelectedPhotosToAdd([]);
      setIsAddSheetOpen(false);
      
      // Invalidate queries to refresh the group photos and main gallery
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groupPhotos', activeGroupId] }),
        queryClient.invalidateQueries({ queryKey: ['photos'] })
      ]);
    }, { showSuccessToast: true });
  }, [selectedPhotosToAdd, activeGroupId, runTask, queryClient]);

  const { 
    tagIdToNameMap: tagMap
  } = useGalleryStore(useShallow(s => ({
    tagIdToNameMap: s.tagIdToNameMap
  })));

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
      setIsAddSheetOpen(true);
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

            {/* Add Photos to Group Dialog / Sheet */}
            <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
              <SheetContent side="right" className="w-[450px] max-w-full sm:w-[540px] bg-white p-0 flex flex-col h-full border-l border-slate-100 shadow-2xl z-[250]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <SheetTitle className="text-lg font-black text-slate-800 tracking-tight">
                    添加照片到合组 / Add Photos to Group
                  </SheetTitle>
                  <button 
                    onClick={() => setIsAddSheetOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-150 text-slate-450 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-2 shrink-0">
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full bg-white border border-slate-200 focus:outline-none focus:border-blue-500 rounded-xl px-4 py-2 text-xs font-bold font-sans pr-10"
                      placeholder="搜索未分组照片... / Search ungrouped..."
                      value={addSearchKeyword}
                      onChange={(e) => setAddSearchKeyword(e.target.value)}
                    />
                    {addSearchKeyword && (
                      <button 
                        onClick={() => setAddSearchKeyword('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    <span>未分组数量 / Ungrouped: {filteredUngroupedPhotos.length}</span>
                    <span>已选择 / Selected: {selectedPhotosToAdd.length}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 min-h-0 no-scrollbar">
                  {ungroupedPhotosQuery.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full bg-slate-100 rounded-xl animate-pulse" />
                      <Skeleton className="h-24 w-full bg-slate-100 rounded-xl animate-pulse" />
                      <Skeleton className="h-24 w-full bg-slate-100 rounded-xl animate-pulse" />
                    </div>
                  ) : filteredUngroupedPhotos.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                      <Layers className="mx-auto text-slate-200" size={32} />
                      <p className="text-xs font-semibold text-slate-400">没有找到未分组的照片</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {filteredUngroupedPhotos.map((photo) => {
                        const isSelected = selectedPhotosToAdd.includes(photo.id);
                        return (
                          <div 
                            key={photo.id}
                            onClick={() => {
                              setSelectedPhotosToAdd(prev => 
                                isSelected ? prev.filter(id => id !== photo.id) : [...prev, photo.id]
                              );
                            }}
                            className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group select-none ${
                              isSelected 
                                ? 'border-blue-600 scale-95 shadow-md shadow-blue-500/10' 
                                : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <img 
                              src={photo.thumb_url || photo.uri || photo.image_url} 
                              alt="Item" 
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {photo.item_code && (
                              <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-xs text-[8px] font-mono text-white px-1 py-0.5 rounded text-center truncate">
                                {photo.item_code}
                              </div>
                            )}
                            <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-black/30 text-transparent border border-white/50'
                            }`}>
                              <Check size={10} className="stroke-[3]" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
                  <button 
                    onClick={() => {
                      setSelectedPhotosToAdd([]);
                      setIsAddSheetOpen(false);
                    }}
                    className="flex-1 py-3 text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-150 transition-colors"
                  >
                    取消 / Cancel
                  </button>
                  <button 
                    onClick={handleConfirmAddPhotos}
                    disabled={selectedPhotosToAdd.length === 0}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-center flex items-center justify-center"
                  >
                    确认添加 ({selectedPhotosToAdd.length})
                  </button>
                </div>
              </SheetContent>
            </Sheet>

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
