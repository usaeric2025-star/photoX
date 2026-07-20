import { useAtomValue } from "jotai";
import React, { memo, useMemo, useEffect } from 'react';
import { useSelectionCount, useSelectedIds, useSelectionActions, useIsMultiSelect, usePermission, useAdminActions, useTranslation } from '#src/hooks/index.js';
import { showToast } from '#src/lib/ui/toast.js';
import {  activeTaskCountAtom } from '#lib/store/index.js';
import { useNormalizedLocation } from '#src/hooks/core/index.js';
import { useConfirm } from '#src/context/ConfirmContext.js';
import { useMediaQuery } from '#src/hooks/index.js';
import { useGroupMutations } from '#src/hooks/group/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { SelectionToolbarActions } from './components/SelectionToolbarActions.js';

/**
 * SelectionCounter
 */
function SelectionCounter({ count }: { count: number }) {
  return (
    <div className="text-sm font-semibold text-slate-700 select-none shrink-0 transition-all flex items-center pr-1 bg-transparent">
      {count}
    </div>
  );
}

/**
 * SelectionToolbar
 * 
 * 批量操作工具欄，僅在多選模式或有選取項目時顯示。
 */
export function SelectionToolbar({ className = '', groupId: propGroupId }: { className?: string; groupId?: string }) {
  const selectedCount = useSelectionCount();
  const selectedIds = useSelectedIds();
  const isMultiSelect = useIsMultiSelect();
  const { clearSelection, patch, toggleMode } = useSelectionActions();
  
  const { deletePhoto, batchUpdate } = useAdminActions();
  const confirm = useConfirm();
  const { combine: combineMutation, removePhotos: removeMutation } = useGroupMutations();
  const [location, setLocation] = useNormalizedLocation();
  const { t } = useTranslation();

  // Smart groupId detection from URL if not provided
  const groupId = useMemo(() => {
    if (propGroupId) return propGroupId;
    const match = location.match(/\/(admin\/)?group\/([^\/]+)/);
    return match ? match[2] : undefined;
  }, [propGroupId, location]);

  const activeTasks = useAtomValue(activeTaskCountAtom);
  const isAnyPending = deletePhoto.isPending || batchUpdate.isPending || combineMutation.isPending || removeMutation.isPending;
  const isVisible = isMultiSelect || selectedCount > 0;

  useEffect(() => {
    if (isVisible) {
      patch({ isAvoidingSelection: true });
      return () => { patch({ isAvoidingSelection: false }); };
    }
  }, [isVisible, patch]);

  // Media Query Subscriptions
  const isSm = useMediaQuery('(min-width: 640px)');
  const isMd = useMediaQuery('(min-width: 768px)');
  
  const { can } = usePermission();
  const canBatchEdit = can('photo:batch-edit');

  if (!canBatchEdit || !isVisible) {
    return null;
  }

  const handleBatchEdit = () => {
    if (selectedCount === 0 || isAnyPending) return;
    setLocation('/admin/batch-edit');
  };

  const handleManualGroup = async () => {
    const idsToGroup = [...selectedIds];
    const toastId = showToast.loading(t('processing') || '處理中...');
    
    try {
      const result = await combineMutation.mutateAsync({ photoIds: idsToGroup });
      showToast.success(t('mergePhotosSuccess', idsToGroup.length), { id: toastId });
      
      // Commented out to prevent jumping to group, enabling multiple consecutive operations
      // if (result?.targetGroupId) {
      //   setLocation(`/admin/group/${result.targetGroupId}`);
      // }
      
      clearSelection();
    } catch (err: unknown) {
      showToast.dismiss(toastId);
      // Errors are also handled by mutation hook's onError
    }
  };

  const handleRemoveFromGroup = async () => {
    if (selectedCount === 0 || isAnyPending || !groupId) return;
    const idsToRemove = [...selectedIds];
    const toastId = showToast.loading(t('processing') || '處理中...');
    
    try {
      await removeMutation.mutateAsync({ photoIds: idsToRemove, groupId });
      showToast.success(t('removePhotosSuccess', idsToRemove.length), { id: toastId });
      clearSelection();
    } catch (err: unknown) {
      showToast.dismiss(toastId);
    }
  };

  const handleBatchToggleHide = async (hide: boolean) => {
    if (selectedCount === 0 || isAnyPending) return;
    const toastId = showToast.loading(t('processing') || '處理中...');
    try {
      await batchUpdate.mutateAsync({ ids: selectedIds, updates: { isHidden: hide } });
      showToast.success(hide ? t('hideSuccess', selectedCount) || '已隱藏' : t('unhideSuccess', selectedCount) || '已取消隱藏', { id: toastId });
      clearSelection();
    } catch (err: unknown) {
      showToast.dismiss(toastId);
    }
  };

  const handleBatchDeleteClick = async () => {
    const ok = await confirm({
      title: '確定要刪除選取的照片嗎？',
      description: `此操作將會永久從系統中刪除這 ${selectedCount} 張照片，且無法復原。`,
      confirmText: '刪除',
      variant: 'destructive',
    });
    if (ok) {
      const toastId = showToast.loading(t('processing') || '處理中...');
      try {
        await deletePhoto.mutateAsync(selectedIds);
        showToast.success(t('deleteSuccess'), { id: toastId });
        clearSelection();
      } catch (err: unknown) {
        showToast.dismiss(toastId);
      }
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 w-full bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] pb-safe animate-in fade-in slide-in-from-bottom-4 duration-300 z-40 ${className}`}>
      <div className="max-w-[1920px] mx-auto relative flex items-center justify-between gap-1.5 sm:gap-4 py-3 px-3 sm:px-6">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            id="exit-selection-btn"
            onClick={() => {
              if (isMultiSelect) {
                toggleMode();
              }
              clearSelection();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0 outline-none"
            title="清除並退出選取"
          >
            <Icon name="x" size={18} />
          </button>
          <SelectionCounter count={selectedCount} />
        </div>

        {isAnyPending && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <LoadingSpinner size="xs" className="text-blue-500" />
            <span className="hidden xs:inline">正在處理中...</span>
            <span className="xs:hidden">處理中...</span>
          </div>
        )}

        <SelectionToolbarActions
          selectedCount={selectedCount}
          isAnyPending={isAnyPending}
          groupId={groupId}
          isSm={isSm}
          isMd={isMd}
          isRemoving={removeMutation.isPending}
          isCombining={combineMutation.isPending}
          activeTasks={activeTasks}
          isDeleting={deletePhoto.isPending}
          onRemoveFromGroup={handleRemoveFromGroup}
          onManualGroup={handleManualGroup}
          onBatchEdit={handleBatchEdit}
          onBatchDelete={handleBatchDeleteClick}
          onBatchToggleHide={handleBatchToggleHide}
          isUpdating={batchUpdate.isPending}
        />
      </div>
    </div>
  );
}
