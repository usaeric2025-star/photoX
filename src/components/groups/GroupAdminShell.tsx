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

            {/* Beautiful Floating Admin Action Dock (when not in multi-select mode) */}
            {!isMultiSelect && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-4 border border-white/10 z-[190] hover:bg-slate-900 transition-all max-w-lg">
                {/* 1. Add Photos button */}
                <button
                  type="button"
                  onClick={() => {
                    if (filters.groupId) {
                      update?.({ photoPickerGroupId: filters.groupId });
                      update?.({ isPhotoPickerOpen: true });
                    }
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 active:scale-95 transition-all"
                  title={(translate as any).addPhotos || 'Add Photos'}
                >
                  <Plus size={14} />
                  <span>{appLang === 'zh' ? '添加照片' : appLang === 'ms' ? 'Tambah Foto' : 'Add Photos'}</span>
                </button>

                <div className="w-px h-4 bg-slate-800" />

                {/* 2. Group Settings button */}
                <button
                  type="button"
                  onClick={() => update?.({ groupSettingsOpen: true } as any)}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 active:scale-95 transition-all"
                  title={(translate as any).database || 'Database'}
                >
                  <Settings2 size={14} />
                  <span>{appLang === 'zh' ? '数据库' : appLang === 'ms' ? 'Pangkalan Data' : 'Database'}</span>
                </button>

                <div className="w-px h-4 bg-slate-800" />

                {/* 3. More Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white active:scale-95 transition-all outline-none">
                    <span>{appLang === 'zh' ? '更多' : appLang === 'ms' ? 'Lain-lain' : 'More'}</span>
                    <MoreVertical size={12} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    side="top"
                    sideOffset={12}
                    className="w-44 sm:w-48 bg-slate-900 text-white rounded-2xl shadow-2xl border border-white/10 py-1 z-[200]"
                  >
                    <DropdownMenuItem
                      onClick={() => {
                        const ids = activeGroupPhotos.map((p) => p.id);
                        update?.({ batchEditingIds: ids });
                        update?.({ isMultiSelect: false });
                        update?.({ selectedIds: [] });
                      }}
                      className="px-4 py-3 cursor-pointer flex items-center gap-2 hover:bg-white/10 focus:bg-white/10 outline-none text-slate-200"
                    >
                      <Pencil size={15} className="text-slate-400" />
                      <span className="text-xs font-bold">
                        {appLang === 'zh' ? '批量编辑' : appLang === 'ms' ? 'Edit Pukal' : 'Batch Edit'}
                      </span>
                    </DropdownMenuItem>
                    
                    <div className="h-px bg-white/10 my-1" />
                    
                    <DropdownMenuItem
                      onClick={() => {
                        update?.({ 
                          alertDialog: {
                            title: appLang === 'zh' ? '解散合组' : appLang === 'ms' ? 'Bubarkan' : 'Dissolve',
                            message: appLang === 'zh' ? '确定要解散此合组吗？组内的照片将被移出但不会被删除。' : appLang === 'ms' ? 'Adakah anda pasti mahu membubarkan kumpulan ini? Foto akan dikeluarkan tetapi tidak dipadamkan.' : 'Are you sure you want to dissolve this group? Photos will be removed but not deleted.',
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
                      className="px-4 py-3 cursor-pointer flex items-center gap-2 hover:bg-red-500/20 focus:bg-red-500/20 outline-none text-red-500"
                    >
                      <FolderMinus size={15} className="text-red-500" />
                      <span className="text-xs font-bold">
                        {appLang === 'zh' ? '解散合组' : appLang === 'ms' ? 'Bubarkan' : 'Dissolve'}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
