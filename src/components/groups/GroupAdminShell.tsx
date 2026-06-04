import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Photo } from "../../types";
import { GroupSettingsSheet } from "./GroupSettingsSheet";
import { GroupDetailSkeleton } from "./GroupDetailSkeleton";
import { GroupHeader } from "./GroupHeader";
import { SelectionToolbar } from "../shared/SelectionToolbar";
import { useGroupAdminLogic } from "./useGroupAdminLogic";
import { GroupGridView } from "./GroupGridView";
import { GroupPhotoPicker } from "./GroupPhotoPicker";
import { useUrlFilters } from "@/hooks/useUrlFilters";

import { useAdminMode, useGroupMutations } from "@/hooks";
import { useAdminActions } from "@/features/admin/useAdminActions";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { translations } from "../../lib/translations";
import { Plus, Settings2, MoreVertical, Pencil, Sparkles, FolderMinus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { toast } from "sonner";

export interface GroupAdminShellProps {
  initialPhotoId?: string | null;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export function GroupAdminShell(props: GroupAdminShellProps) {
  const { onCancelAnalyze, isAnalyzing } = props;
  const isAdminMode = useAdminMode();

  const { filters, setGroupId, setPhotoId } = useUrlFilters();
  const appLang = useUIStore((s) => s.appLang);
  const isPhotoPickerOpen = useUIStore((s) => s.isPhotoPickerOpen);
  const photoPickerGroupId = useUIStore((s) => s.photoPickerGroupId);
  const update = useUIStore((s) => s.update);

  const adminActions = useAdminActions();
  const { dissolve } = useGroupMutations();
  const onUngroup = async (groupId: string) => {
    await dissolve.execute(groupId);
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

  const stableGetPhotoProps = 
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
    });

  const handleEditPhoto = 
    (p: Photo) => {
      if (storeEditPhoto) {
        storeEditPhoto(p);
      } else {
        update({ editPhotoId: p.id });
      }
    };

  const handlePhotoClick = 
    (photo: Photo) => {
      if (isMultiSelect) {
        update((state) => ({
          selectedIds: state.selectedIds.includes(photo.id)
            ? state.selectedIds.filter((id) => id !== photo.id)
            : [...state.selectedIds, photo.id],
        }));
      } else {
        setPhotoId(photo.id);
      }
    };

  const handlePhotoContextMenu = 
    (e: React.MouseEvent | React.TouchEvent, photo: Photo) => {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (isAdminMode) {
        update({ isMultiSelect: true, selectedIds: [photo.id] });
        if ("vibrate" in navigator) navigator.vibrate(50);
      }
    };

  const handleCloseLightbox = () => {
    setPhotoId(null);
    update({ focusedGroupPhotoId: null });
  };

  const handlePrevLightbox = (idx: number) => {
      const prev = idx > 0 ? idx - 1 : activeGroupPhotos.length - 1;
      if (activeGroupPhotos.length > 0) {
        setPhotoId(activeGroupPhotos[prev].id);
        update({ focusedGroupPhotoId: activeGroupPhotos[prev].id });
      }
    };

  const handleNextLightbox = (idx: number) => {
      const next = idx < activeGroupPhotos.length - 1 ? idx + 1 : 0;
      if (activeGroupPhotos.length > 0) {
        setPhotoId(activeGroupPhotos[next].id);
        update({ focusedGroupPhotoId: activeGroupPhotos[next].id });
      }
    };

  const handleUngroupLightbox = (photoId: string) => {
      confirmBulkRemove([photoId]);
      setPhotoId(null);
      update({ focusedGroupPhotoId: null });
    };

  const handleSetGroupCoverLightbox = (photoId: string) => setCover(photoId);

  const handleToggleHiddenLightbox = (p: Photo) => {
      const newStatus = !p.is_hidden;
      persistPhotoChange(p.id, { is_hidden: newStatus });
    };

  return (
    <>
      <AnimatePresence>
        {filters.groupId !== null && (
          <motion.div
            ref={containerRef}
            onScroll={handleScroll}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-brand-bg overflow-hidden pt-safe flex flex-col"
          >
            {isLoading && activeGroupPhotos.length === 0 ? (
              <GroupDetailSkeleton />
            ) : (
              <>
                {/* Top Header */}
                <GroupHeader update={update} 
                  activeGroupId={filters.groupId}
                  
                  isAdminMode={isAdminMode}
                  groupData={groupData}
                  isGroupDataLoading={isGroupDataLoading}
                  activeGroupPhotos={activeGroupPhotos}
                  onBatchAiAnalyzeByGroupId={analyzeGroupById}
                />

                <GroupGridView
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

            {/* Bottom Toolbar (when not in multi-select mode) */}
            {!isMultiSelect && (
              <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-around z-[190] pb-safe-offset-2">
                {/* 1. Add Photos button */}
                <button
                  type="button"
                  onClick={() => {
                    if (filters.groupId) {
                      update?.({ photoPickerGroupId: filters.groupId });
                      update?.({ isPhotoPickerOpen: true });
                    }
                  }}
                  className="flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-tight text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1 group-hover:bg-emerald-50 transition-colors">
                    <Plus size={18} className="text-emerald-500" />
                  </div>
                  <span>{appLang === 'zh' ? '添加' : 'Add'}</span>
                </button>

                {/* 2. Group Settings button */}
                <button
                  type="button"
                  onClick={() => update?.({ groupSettingsOpen: true } as any)}
                  className="flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-tight text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1 group-hover:bg-indigo-50 transition-colors">
                    <Settings2 size={18} className="text-indigo-500" />
                  </div>
                  <span>{appLang === 'zh' ? '编辑' : 'Edit'}</span>
                </button>

                {/* 3. Save Sequence button */}
                <button
                  type="button"
                  onClick={() => {
                     toast.success(appLang === 'zh' ? '排序已同步' : 'Order synced');
                  }}
                  className="flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-tight text-slate-500 hover:text-amber-600 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1 group-hover:bg-amber-50 transition-colors">
                    <Sparkles size={18} className="text-amber-500" />
                  </div>
                  <span>{appLang === 'zh' ? '排序' : 'Order'}</span>
                </button>

                {/* 4. Dissolve button */}
                <button
                  type="button"
                  onClick={() => {
                    update?.({ 
                      alertDialog: {
                        title: appLang === 'zh' ? '解散合组' : 'Dissolve',
                        message: appLang === 'zh' ? '确定要解散此合组吗？' : 'Are you sure you want to dissolve this group?',
                        type: 'danger',
                        onConfirm: async () => {
                           if (!filters.groupId) return;
                           try {
                              await dissolve.mutateAsync(filters.groupId);
                              setGroupId(null);
                           } catch (err) {
                              toast.error(`解散失败: ${(err as Error).message}`);
                           }
                        }
                      }
                    });
                  }}
                  className="flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-tight text-slate-500 hover:text-red-600 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1 group-hover:bg-red-50 transition-colors">
                    <FolderMinus size={18} className="text-red-500" />
                  </div>
                  <span>{appLang === 'zh' ? '解散' : 'Dissolve'}</span>
                </button>
              </div>
            )}

            {/* Photo Picker for adding photos to group */}
            <GroupPhotoPicker
              isOpen={!!isPhotoPickerOpen}
              onClose={() => update({ isPhotoPickerOpen: false })}
              groupId={filters.groupId || ""}
              onAdd={async (ids) => {
                if (filters.groupId) {
                  await handleAddToGroup(ids, filters.groupId);
                }
              }}
            />

            {/* Group Settings Sheet */}
            <GroupSettingsSheet 
              showGroupSettings={groupSettingsOpen}
              setShowGroupSettings={(show) => update({ groupSettingsOpen: show })}
              activeGroupId={filters.groupId}
              groupData={groupData}
              setGroupData={setGroupData}
              onUngroup={onUngroup}
              update={update}
              handleUpdateGroupData={handleUpdateGroupData}
              handleBatchUpdateDimensions={handleBatchUpdateDimensions}
              
              
              t={translate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
