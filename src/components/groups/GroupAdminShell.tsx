import React, { useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Photo } from "../../types";
import { PhotoLightbox } from "../PhotoLightbox";
import { GroupSettingsSheet } from "./GroupSettingsSheet";
import { GroupDetailSkeleton } from "./GroupDetailSkeleton";
import { GroupHeader } from "./GroupHeader";
import { SelectionToolbar } from "../shared/SelectionToolbar";
import { useGroupAdminLogic } from "./useGroupAdminLogic";
import { GroupGridView } from "./GroupGridView";
import { GroupPhotoPicker } from "./GroupPhotoPicker";

import { useAdminMode } from "@/hooks";
import { useAdminActions } from "@/features/admin/useAdminActions";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { translations } from "../../lib/translations";

export interface GroupAdminShellProps {
  initialPhotoId?: string | null;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export function GroupAdminShell(props: GroupAdminShellProps) {
  const { onAiAnalyze, onCancelAnalyze, isAnalyzing } = props;
  const isAdminMode = useAdminMode();

  const { activeGroupId, appLang, isPhotoPickerOpen, photoPickerGroupId, update } = useUIStore(
    useShallow((s) => ({
      activeGroupId: s.activeGroupId,
      update: s.update,
      appLang: s.appLang,
      isPhotoPickerOpen: s.isPhotoPickerOpen,
      photoPickerGroupId: s.photoPickerGroupId,
    })),
  );

  const adminActions = useAdminActions();
  const onUngroup = (groupId: string) => {
    /* To be implemented properly via useAdminActions */
  };
  const storeEditPhoto = (p: Photo | string) =>
    update({ editPhotoId: typeof p === "string" ? p : p.id });
  const analyzeGroupById = async (id: string) => {}; // Unused or needs porting
  const handleAddToGroup = async (ids: string[], groupId: string) => {
    await adminActions.batchUpdate.mutateAsync({
      ids,
      updates: { group_id: groupId },
    });
  };

  const { activeGroupPhotos, focusedGroupPhotoId, draggedPhotoId, groupSettingsOpen, groupData, setGroupData, isGroupDataLoading, containerRef, virtualGridRef, currentHighlightId, handleScroll, confirmBulkRemove, persistPhotoChange, handleUpdateGroupData, handleBatchUpdateDimensions, handleReorder, isMultiSelect, setCover, isGroupPhotosLoading, handleBulkAction: hookHandleBulkAction } = useGroupAdminLogic({
    initialPhotoId: props.initialPhotoId,
  });

  const translate =
    translations[
      appLang as keyof typeof translations as keyof typeof translations
    ] || translations.en;

  const isLoading = isGroupPhotosLoading || isGroupDataLoading;

  const dragState = React.useRef({
    draggedPhotoId,
    handleReorder,
    isAdminMode,
    isMultiSelect,
  });
  React.useEffect(() => {
    dragState.current = {
      draggedPhotoId,
      handleReorder,
      isAdminMode,
      isMultiSelect,
    };
  }, [draggedPhotoId, handleReorder, isAdminMode, isMultiSelect]);

  const stableGetPhotoProps = useCallback(
    (photo: Photo) => ({
      draggable:
        dragState.current.isAdminMode && !dragState.current.isMultiSelect,
      onDragStart: () => update({ draggedPhotoId: photo.id }),
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        const currentDraggedId = dragState.current.draggedPhotoId;
        if (currentDraggedId) {
          dragState.current.handleReorder(currentDraggedId, photo.id);
          update({ draggedPhotoId: null });
        }
      },
    }),
    [update],
  );

  const handleEditPhoto = useCallback(
    (p: Photo) => {
      if (storeEditPhoto) {
        storeEditPhoto(p);
      } else {
        update({ editPhotoId: p.id });
      }
    },
    [storeEditPhoto, update],
  );

  const handlePhotoClick = useCallback(
    (photo: Photo) => {
      if (isMultiSelect) {
        update((state) => ({
          selectedIds: state.selectedIds.includes(photo.id)
            ? state.selectedIds.filter((id) => id !== photo.id)
            : [...state.selectedIds, photo.id],
        }));
      } else {
        update({ focusedGroupPhotoId: photo.id });
      }
    },
    [isMultiSelect, update],
  );

  const handlePhotoContextMenu = useCallback(
    (e: React.MouseEvent | React.TouchEvent, photo: Photo) => {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (isAdminMode) {
        update({ isMultiSelect: true });
        update({ selectedIds: [photo.id] });
        if ("vibrate" in navigator) navigator.vibrate(50);
      }
    },
    [isAdminMode, update],
  );

  const handleCloseLightbox = useCallback(
    () => update({ focusedGroupPhotoId: null }),
    [update],
  );

  const handlePrevLightbox = useCallback(
    (idx: number) => {
      const prev = idx > 0 ? idx - 1 : activeGroupPhotos.length - 1;
      if (activeGroupPhotos.length > 0)
        update({ focusedGroupPhotoId: activeGroupPhotos[prev].id });
    },
    [activeGroupPhotos, update],
  );

  const handleNextLightbox = useCallback(
    (idx: number) => {
      const next = idx < activeGroupPhotos.length - 1 ? idx + 1 : 0;
      if (activeGroupPhotos.length > 0)
        update({ focusedGroupPhotoId: activeGroupPhotos[next].id });
    },
    [activeGroupPhotos, update],
  );

  const handleUngroupLightbox = useCallback(
    (photoId: string) => {
      confirmBulkRemove([photoId]);
      update({ focusedGroupPhotoId: null });
    },
    [confirmBulkRemove, update],
  );

  const handleSetGroupCoverLightbox = useCallback(
    (photoId: string) => setCover(photoId),
    [setCover],
  );

  const handleToggleHiddenLightbox = useCallback(
    (p: Photo) => {
      const newStatus = !p.is_hidden;
      persistPhotoChange(p.id, { is_hidden: newStatus });
    },
    [persistPhotoChange],
  );

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
                <GroupHeader update={update} 
                  activeGroupId={activeGroupId}
                  
                  isAdminMode={isAdminMode}
                  groupData={groupData}
                  isGroupDataLoading={isGroupDataLoading}
                  activeGroupPhotos={activeGroupPhotos}
                  onBatchAiAnalyzeByGroupId={analyzeGroupById}
                />

                <GroupGridView
                  key={activeGroupId}
                  virtualGridRef={virtualGridRef}
                  photos={activeGroupPhotos}
                  isLoading={isGroupPhotosLoading}
                  highlightId={currentHighlightId}
                  onPhotoClick={handlePhotoClick}
                  onPhotoContextMenu={handlePhotoContextMenu}
                  getPhotoProps={stableGetPhotoProps}
                />
              </>
            )}

            {/* Unified Multi-Select Floating Bar */}
            <SelectionToolbar
              onDelete={confirmBulkRemove}
              onHide={(ids) => adminActions.batchUpdate.mutateAsync({ ids, updates: { is_hidden: true } })}
              onCopy={(ids) => hookHandleBulkAction('batch')}
            />

            {/* Photo Picker for adding photos to group */}
            <GroupPhotoPicker
              isOpen={!!isPhotoPickerOpen}
              onClose={() => update({ isPhotoPickerOpen: false })}
              groupId={activeGroupId || ""}
              onAdd={async (ids) => {
                if (activeGroupId) {
                  await handleAddToGroup(ids, activeGroupId);
                }
              }}
            />

            {/* Group Settings Sheet */}
            <GroupSettingsSheet 
              showGroupSettings={groupSettingsOpen}
              setShowGroupSettings={(show) => update({ groupSettingsOpen: show })}
              activeGroupId={activeGroupId}
              groupData={groupData}
              setGroupData={setGroupData}
              onUngroup={onUngroup}
              update={update}
              handleUpdateGroupData={handleUpdateGroupData}
              handleBatchUpdateDimensions={handleBatchUpdateDimensions}
              
              
              t={translate}
            />

            {/* Unified Photo Lightbox */}
            <AnimatePresence>
              {focusedGroupPhotoId &&
                (() => {
                  const currentIndex = activeGroupPhotos.findIndex(
                    (p) => p.id === focusedGroupPhotoId,
                  );
                  const photo = activeGroupPhotos[currentIndex];
                  if (!photo) return null;

                  return (
                    <PhotoLightbox
                      photoId={focusedGroupPhotoId}
                      displayPhotos={activeGroupPhotos}
                      onClose={handleCloseLightbox}
                      onPhotoIdChange={(id) => update({ activePhotoId: id })}
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
}
