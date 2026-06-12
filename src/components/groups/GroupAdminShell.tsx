import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Photo } from "../../types";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { GroupSettingsSheet } from "./GroupSettingsSheet";
import { GroupDetailSkeleton } from "./GroupDetailSkeleton";
import { GroupHeader } from "./GroupHeader";
import { SelectionToolbar } from "../shared/SelectionToolbar";
import { useGroupAdminLogic } from "./useGroupAdminLogic";
import { GroupGridView } from "./GroupGridView";
import { GroupPhotoPicker } from "./GroupPhotoPicker";
import { useAdminMode, useGroupMutations, useUrlFilters, useAIBatchAnalysis, useCopyToClipboard } from "@/hooks";
import { useAdminActions } from "@/hooks/admin/useAdminActions";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { translations } from "../../lib/translations";
import { Plus, Settings2, MoreVertical, Pencil, Sparkles, FolderMinus } from "lucide-react";
import { CollapsibleDescription } from "./CollapsibleDescription";
import { GroupInfoPanel } from "./GroupInfoPanel";
import { getSafeText } from "@/lib/ai/safeText";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from "../ui/dropdown-menu";

export function GroupAdminShell() {
  const isAdminMode = useAdminMode();
  const navigate = useRouterSafe().navigate;
  const { copy } = useCopyToClipboard({ successMessage: "合组ID已复制" });
  const { filters, setGroupId, setPhotoId } = useUrlFilters();
  const appLang = useUIStore((s) => s.appLang);
  const isPhotoPickerOpen = useUIStore((s) => s.isPhotoPickerOpen);
  const update = useUIStore((s) => s.update);

  const [isDissolveOpen, dissolveDialog] = useDisclosure(false);
  const adminActions = useAdminActions();
  const { dissolve } = useGroupMutations();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  
  const onUngroup = async (groupId: string) => {
    await (dissolve.execute as any)(groupId);
  };
  
  const storeEditPhoto = (p: Photo | string) =>
    update({ editPhotoId: typeof p === "string" ? p : p.id });
    
  const handleAddToGroup = async (ids: string[], groupId: string) => {
    await (adminActions.batchUpdate.mutateAsync as any)({
      ids,
      updates: { group_id: groupId } });
  };

  const [isBulkRemoveOpen, bulkRemoveDialog] = useDisclosure(false);
  const [bulkRemoveRequest, setBulkRemoveRequest] = useState<{ ids: string[], title: string, message: string } | null>(null);

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
    handleBatchUpdateDimensions, 
    handleReorder, 
    isMultiSelect, 
    setCover, 
    isGroupPhotosLoading, 
    handleBulkAction: hookHandleBulkAction 
  } = useGroupAdminLogic();

  const handleBulkRemoveRequest = (ids: string[]) => {
    const info = confirmBulkRemove(ids);
    setBulkRemoveRequest({ ids, ...info });
    bulkRemoveDialog.open();
  };

  const translate = translations[appLang as keyof typeof translations] || translations.en;

  const isLoading = isGroupPhotosLoading || isGroupDataLoading;

  const dragState = React.useRef({
    draggedPhotoId: useUIStore.getState().draggedPhotoId,
    handleReorder,
    isAdminMode,
    isMultiSelect });
  
  const draggedPhotoId = useUIStore(s => s.draggedPhotoId);
  
  React.useEffect(() => {
    dragState.current = {
      draggedPhotoId,
      handleReorder,
      isAdminMode,
      isMultiSelect };
  }, [draggedPhotoId, handleReorder, isAdminMode, isMultiSelect]);

  const stableGetPhotoProps = (photo: Photo) => ({
    showCoverBadge: true,
    draggable: dragState.current.isAdminMode && !dragState.current.isMultiSelect,
    onDragStart: () => update({ draggedPhotoId: photo.id }),
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      const currentDraggedId = dragState.current.draggedPhotoId;
      if (currentDraggedId) {
        dragState.current.handleReorder(currentDraggedId, photo.id);
        update({ draggedPhotoId: null });
      }
    } });

  const handlePhotoClick = (photo: Photo) => {
    if (isMultiSelect) {
      const selectedIds = useUIStore.getState().selectedIds;
      update({
        selectedIds: selectedIds.includes(photo.id)
          ? selectedIds.filter((id) => id !== photo.id)
          : [...selectedIds, photo.id] });
    } else {
      setPhotoId(photo.id);
    }
  };

  const handlePhotoContextMenu = (e: React.MouseEvent | React.TouchEvent, photo: Photo) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (isAdminMode) {
      update({ isMultiSelect: true, selectedIds: [photo.id] });
      if ("vibrate" in navigator) navigator.vibrate(50);
    }
  };

  return (
    <>
      <AnimatePresence>
        {filters.groupId !== null && (
          <motion.div
            ref={containerRef}
            onScroll={handleScroll}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-overlay bg-white overflow-hidden flex flex-col"
          >
            {/* Always render Header and Content so they can handle internal loading states smoothly */}
            <GroupHeader 
              displayName={(typeof groupData?.name === 'object' ? (groupData?.name?.[appLang as keyof typeof groupData.name] || groupData?.name?.zh || groupData?.name?.en || groupData?.name?.ms) : groupData?.name) || `GROUP ${filters.groupId?.slice(-4)}`}
              activeGroupId={filters.groupId}
              isAdminMode={isAdminMode}
              isGroupDataLoading={isGroupDataLoading}
              onClose={() => {
                navigate({ to: '/admin', search: (prev: any) => ({ ...prev, groupId: undefined, photoId: undefined }), resetScroll: false });
              }}
              onSettingsClick={() => update({ groupSettingsOpen: true })}
              onCopyId={(id) => copy(id)}
              onBatchEdit={(ids) => update({ batchEditingIds: ids })}
              activeGroupPhotos={activeGroupPhotos}
              appLang={appLang}
            />

            <GroupInfoPanel groupData={groupData || undefined} lang={appLang} />

            <GroupGridView
              virtualGridRef={virtualGridRef}
              photos={activeGroupPhotos}
              isLoading={isGroupPhotosLoading}
              groupData={groupData}
              highlightId={currentHighlightId}
              onPhotoClick={handlePhotoClick}
              onPhotoContextMenu={handlePhotoContextMenu}
              getPhotoProps={stableGetPhotoProps}
            />

            {/* Unified Multi-Select Floating Bar */}
            <SelectionToolbar
              onDelete={handleBulkRemoveRequest}
              onHide={(ids) => (adminActions.batchUpdate.mutateAsync as any)({ ids, updates: { is_hidden: true } })}
              onCopy={(ids) => hookHandleBulkAction('batch')}
            />

            {/* Bottom Toolbar (when not in multi-select mode) */}
            {!isMultiSelect && (
              <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-around z-[var(--z-index-overlay)] pb-safe-offset-2">
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

                {/* 3. AI Analyze button */}
                <button
                  type="button"
                  onClick={() => {
                    handleBatchAiAnalyze(activeGroupPhotos, filters.groupId || undefined);
                  }}
                  className="flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-tight text-slate-500 hover:text-blue-600 transition-colors relative"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1 group-hover:bg-blue-50 transition-colors relative overflow-hidden">
                    <Sparkles size={18} className="text-blue-500" />
                  </div>
                  <span>{appLang === 'zh' ? 'AI 识别' : 'AI Identify'}</span>
                </button>

                {/* 4. Dissolve button */}
                <button
                  type="button"
                  onClick={dissolveDialog.open}
                  className="flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-tight text-slate-500 hover:text-red-600 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1 group-hover:bg-red-50 transition-colors">
                    <FolderMinus size={18} className="text-red-500" />
                  </div>
                  <span>{appLang === 'zh' ? '解散' : 'Dissolve'}</span>
                </button>
              </div>
            )}
            
            <ConfirmDialog
              open={isDissolveOpen}
              onOpenChange={dissolveDialog.toggle}
              title={appLang === 'zh' ? '解散合组' : 'Dissolve'}
              description={appLang === 'zh' ? '确定要解散此合组吗？' : 'Are you sure you want to dissolve this group?'}
              confirmText={appLang === 'zh' ? '确定' : 'Confirm'}
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
              confirmText={appLang === 'zh' ? '确定' : 'Confirm'}
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
