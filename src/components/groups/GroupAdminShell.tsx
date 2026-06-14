import { useRouterSafe } from "@/hooks/core/useRouterSafe";
import React, { useState } from "react";
import { Photo } from "../../types";
import { useDisclosure } from "@/hooks/core/useDisclosure";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { GroupSettingsModal } from "./GroupSettingsModal";
import { GroupDetailSkeleton } from "./GroupDetailSkeleton";
import { GroupHeader } from "./GroupHeader";
import { SelectionToolbar } from "../shared/SelectionToolbar";
import { useGroupAdminLogic } from "./useGroupAdminLogic";
import { GroupGridView } from "./GroupGridView";
import { GroupPhotoPicker } from "./GroupPhotoPicker";
import {
  useAdminMode,
  useGroupMutations,
  useUrlFilters,
  useAIBatchAnalysis,
  useCopyToClipboard,
} from "@/hooks";
import { useAdminMaintenance } from "@/hooks/admin/useAdminMaintenance";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { translations } from "@/locales";
import {
  Plus,
  Settings2,
  MoreVertical,
  Pencil,
  Sparkles,
  FolderMinus,
} from "lucide-react";
import { CollapsibleDescription } from "./CollapsibleDescription";
import { GroupInfoPanel } from "./GroupInfoPanel";
import { getSafeText } from "@/services/ai/safeText";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { GroupAdminBottomBar } from "./GroupAdminBottomBar";
import { Modal } from "../ui/Modal";
import { PhotoEditModal } from "@/components/admin/PhotoEditModal";

export function GroupAdminShell() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    })
  );

  const isAdminMode = useAdminMode();
  const navigate = useRouterSafe().navigate;
  const { copy } = useCopyToClipboard({ successMessage: "合组ID已复制" });
  const { filters, setGroupId, setPhotoId } = useUrlFilters();
  const appLang = useUIStore((s) => s.appLang);
  const isPhotoPickerOpen = useUIStore((s) => s.isPhotoPickerOpen);
  const update = useUIStore((s) => s.update);
  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const newPhotoData = useUIStore((s) => s.newPhotoData);

  const [isDissolveOpen, dissolveDialog] = useDisclosure(false);
  const adminActions = useAdminMaintenance();
  const { dissolve } = useGroupMutations();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();

  const onUngroup = async (groupId: string) => {
    await dissolve.mutateAsync(groupId);
  };

  const storeEditPhoto = (p: Photo | string) =>
    update({ editPhotoId: typeof p === "string" ? p : p.id });

  const handleAddToGroup = async (ids: string[], groupId: string) => {
    await (adminActions.batchUpdate.mutateAsync as any)({
      ids,
      updates: { group_id: groupId },
    });
  };

  const [isBulkRemoveOpen, bulkRemoveDialog] = useDisclosure(false);
  const [bulkRemoveRequest, setBulkRemoveRequest] = useState<{
    ids: string[];
    title: string;
    message: string;
  } | null>(null);

  const {
    activeGroupPhotos,
    groupSettingsOpen,
    groupData,
    setGroupData,
    isGroupDataLoading,
    containerRef,
    virtualGridRef,
    currentHighlightId,
    handleScroll,
    confirmBulkRemove,
    performBulkRemove,
    persistPhotoChange,
    handleUpdateGroupData,
    handleToggleTag,
    handleBatchUpdateDimensions,
    handleReorder,
    isMultiSelect,
    setCover,
    isGroupPhotosLoading,
    handleBulkAction: hookHandleBulkAction,
  } = useGroupAdminLogic();

  const [optimisticPhotos, addOptimisticAction] = React.useOptimistic(
    activeGroupPhotos,
    (state: Photo[], action: { type: 'reorder', payload: { draggedId: string, targetId: string } } | { type: 'update', payload: { id: string, data: any } }) => {
      if (action.type === 'reorder') {
        const { draggedId, targetId } = action.payload;
        const dragIdx = state.findIndex(p => p.id === draggedId);
        const hoverIdx = state.findIndex(p => p.id === targetId);
        if (dragIdx === -1 || hoverIdx === -1) return state;
        const next = [...state];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(hoverIdx, 0, moved);
        return next.map((p, i) => ({ ...p, group_order: i }));
      }
      if (action.type === 'update') {
        const { id, data } = action.payload;
        return state.map(p => {
          if (p.id === id) {
            // For tags, handle specially if it's a tag toggle action
            if (data.tags && typeof data.tags === 'function') {
              return { ...p, tags: data.tags(p.tags) };
            }
            return { ...p, ...data };
          }
          return p;
        });
      }
      return state;
    }
  );

  const handleToggleTagOptimistic = (photo: Photo, tagId: string) => {
    const currentTags = Array.isArray(photo.tags) ? photo.tags : [];
    const isRemoving = currentTags.some(t => String(t.id) === tagId);
    
    const nextTags = isRemoving
      ? currentTags.filter((t) => String(t.id) !== tagId)
      : [...currentTags, { id: tagId, name: '', aliases: [] }];

    React.startTransition(() => {
      addOptimisticAction({
        type: 'update',
        payload: { id: photo.id, data: { tags: nextTags } }
      });
    });

    handleToggleTag(photo, tagId);
  };

  const handleBulkRemoveRequest = (ids: string[]) => {
    const info = confirmBulkRemove(ids);
    setBulkRemoveRequest({ ids, ...info });
    bulkRemoveDialog.open();
  };

  const translate =
    translations[appLang as keyof typeof translations] || translations.en;

  const isLoading = isGroupPhotosLoading || isGroupDataLoading;

  const dragState = React.useRef({
    draggedPhotoId: useUIStore.getState().draggedPhotoId,
    handleReorder,
    isAdminMode,
    isMultiSelect,
  });

  const draggedPhotoId = useUIStore((s) => s.draggedPhotoId);

  React.useEffect(() => {
    dragState.current = {
      draggedPhotoId,
      handleReorder,
      isAdminMode,
      isMultiSelect,
    };
  }, [draggedPhotoId, handleReorder, isAdminMode, isMultiSelect]);

  const stableGetPhotoProps = (photo: Photo) => ({
    showCoverBadge: true,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const draggedId = active.id as string;
      const targetId = over.id as string;
      
      // Optimistic update
      React.startTransition(() => {
        addOptimisticAction({ 
          type: 'reorder', 
          payload: { draggedId, targetId } 
        });
      });
      
      handleReorder(draggedId, targetId);
    }
  };

  const handlePhotoClick = (photo: Photo) => {
    if (isMultiSelect) {
      const selectedIds = useUIStore.getState().selectedIds;
      update({
        selectedIds: selectedIds.includes(photo.id)
          ? selectedIds.filter((id) => id !== photo.id)
          : [...selectedIds, photo.id],
      });
    } else {
      setPhotoId(photo.id);
    }
  };

  const handlePhotoContextMenu = (
    e: React.MouseEvent | React.TouchEvent,
    photo: Photo,
  ) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (isAdminMode) {
      update({ isMultiSelect: true, selectedIds: [photo.id] });
      if ("vibrate" in navigator) navigator.vibrate(50);
    }
  };

  const handleClose = () => {
    if (!document.startViewTransition) {
      navigate({
        to: "/admin",
        search: (prev: any) => ({
          ...prev,
          groupId: undefined,
          photoId: undefined,
        }),
        resetScroll: false,
      });
      return;
    }
    document.startViewTransition(() => {
      navigate({
        to: "/admin",
        search: (prev: any) => ({
          ...prev,
          groupId: undefined,
          photoId: undefined,
        }),
        resetScroll: false,
      });
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white overflow-hidden w-full relative">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full flex flex-col overflow-hidden bg-white"
      >
        {/* Always render Header and Content so they can handle internal loading states smoothly */}
        <GroupHeader
          displayName={
            (typeof groupData?.name === "object"
              ? groupData?.name?.[appLang as keyof typeof groupData.name] ||
                groupData?.name?.zh ||
                groupData?.name?.en ||
                groupData?.name?.ms
              : groupData?.name) || `GROUP ${filters.groupId?.slice(-4)}`
          }
          activeGroupId={filters.groupId}
          isAdminMode={isAdminMode}
          isGroupDataLoading={isGroupDataLoading}
          onClose={handleClose}
          onSettingsClick={() => update({ groupSettingsOpen: true })}
          onCopyId={(id) => copy(id)}
          onBatchEdit={(ids) => {
            update({ batchEditingIds: ids });
            navigate({ to: "/admin/batch-edit" });
          }}
          activeGroupPhotos={activeGroupPhotos}
          appLang={appLang}
        />

        <GroupInfoPanel groupData={groupData || undefined} lang={appLang} />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={optimisticPhotos.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <GroupGridView
              virtualGridRef={virtualGridRef}
              photos={optimisticPhotos}
              isLoading={isGroupPhotosLoading}
              groupData={groupData}
              highlightId={currentHighlightId}
              onPhotoClick={handlePhotoClick}
              onPhotoContextMenu={handlePhotoContextMenu}
              getPhotoProps={stableGetPhotoProps}
              isSortable={isAdminMode && !isMultiSelect}
            />
          </SortableContext>
        </DndContext>

        {!isGroupPhotosLoading && optimisticPhotos.length === 0 && (
          <div className="flex flex-col items-center justify-center p-10 text-slate-400">
            <p>No photos found in this group.</p>
          </div>
        )}

        {/* Unified Multi-Select Floating Bar */}
        <SelectionToolbar
          onDelete={handleBulkRemoveRequest}
          onHide={(ids) => {
            // Optimistic update
            React.startTransition(() => {
              ids.forEach(id => {
                addOptimisticAction({
                  type: 'update',
                  payload: { id, data: { is_hidden: true } }
                });
              });
            });

            return (adminActions.batchUpdate.mutateAsync as any)({
              ids,
              updates: { is_hidden: true },
            });
          }}
          onCopy={(ids) => hookHandleBulkAction("batch")}
          onBatchEdit={(ids) => {
            update({ batchEditingIds: ids });
            navigate({ to: "/admin/batch-edit" });
          }}
        />

        {/* Unified Feedback and Management Bar */}
        <GroupAdminBottomBar
          appLang={appLang}
          isMultiSelect={isMultiSelect}
          onAddPhotos={() => {
            if (filters.groupId) {
              update?.({ photoPickerGroupId: filters.groupId });
              update?.({ isPhotoPickerOpen: true });
            }
          }}
          onSettingsClick={() => update?.({ groupSettingsOpen: true })}
          onAiAnalyze={() =>
            handleBatchAiAnalyze(activeGroupPhotos, filters.groupId || undefined)
          }
          onDissolve={dissolveDialog.open}
        />

        <ConfirmDialog
          open={isDissolveOpen}
          onOpenChange={dissolveDialog.toggle}
          title={appLang === "zh" ? "解散合组" : "Dissolve"}
          description={
            appLang === "zh"
              ? "确定要解散此合组吗？"
              : "Are you sure you want to dissolve this group?"
          }
          confirmText={appLang === "zh" ? "确定" : "Confirm"}
          variant="destructive"
          onConfirm={async () => {
            if (!filters.groupId) return;
            try {
              await (dissolve.mutateAsync as any)(filters.groupId);
              setGroupId(null);
            } catch (err) {
              // Handled by mutation
            }
          }}
        />

        <ConfirmDialog
          open={isBulkRemoveOpen}
          onOpenChange={bulkRemoveDialog.toggle}
          title={bulkRemoveRequest?.title || ""}
          description={bulkRemoveRequest?.message || ""}
          confirmText={appLang === "zh" ? "确定" : "Confirm"}
          variant="destructive"
          onConfirm={async () => {
            if (bulkRemoveRequest) {
              await performBulkRemove(bulkRemoveRequest.ids);
              setBulkRemoveRequest(null);
            }
          }}
        />

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
        <GroupSettingsModal
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

        {(editPhotoId || newPhotoData) && <PhotoEditModal />}
      </div>
    </div>
  );
}
