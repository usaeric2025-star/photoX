import { useAtomValue } from "jotai";
import React, { memo, useMemo, useEffect } from 'react';
import { useSelectionCount, useSelectedIds, useSelectionActions, useIsMultiSelect, usePermission, useAdminActions, useTranslation } from '#src/hooks/index.js';
import { feedback } from '#lib/feedback.js';
import {  activeTaskCountAtom } from '#lib/store/index.js';
import { useNormalizedLocation } from '#src/hooks/core/index.js';
import { useConfirm } from '#src/context/ConfirmContext.js';
import { useMediaQuery } from '#src/hooks/index.js';
import { useGroupMutations } from '#src/hooks/group/index.js';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { SelectionToolbarActions } from './components/SelectionToolbarActions.js';
import { TopLayer } from '#src/components/ui/TopLayer.js';

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
 * 批量操作工具欄，利用 TopLayer 確保始終在最上層且不參與 z-index 競爭。
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

  const isBatchEditPage = location.startsWith('/admin/batch-edit');

  if (!canBatchEdit || !isVisible || isBatchEditPage) {
    return null;
  }

  const handleBatchEdit = () => {
    if (selectedCount === 0 || isAnyPending) return;
    setLocation('/admin/batch-edit');
  };

  const handleManualGroup = async () => {
    if (selectedCount < 2) {
      feedback.info(t('selectAtLeastTwoToGroup') || '請至少選取 2 張照片以進行合組');
      return;
    }
    const idsToGroup = [...selectedIds];
    try {
      await combineMutation.mutateAsync({ photoIds: idsToGroup });
    } catch (err) {
      // Handled by combineMutation
    }
  };

  const handleRemoveFromGroup = async () => {
    if (selectedCount === 0 || isAnyPending || !groupId) return;
    const idsToRemove = [...selectedIds];
    await feedback.promise(
      removeMutation.mutateAsync({ photoIds: idsToRemove, groupId }),
      {
        loading: t('processing') || '處理中...',
        success: t('removePhotosSuccess', idsToRemove.length),
        error: t('removePhotosFailed') || '移出失敗'
      }
    );
    clearSelection();
  };

  const handleBatchToggleHide = async (hide: boolean) => {
    if (selectedCount === 0 || isAnyPending) return;
    await feedback.promise(
      batchUpdate.mutateAsync({ ids: selectedIds, updates: { isHidden: hide } }),
      {
        loading: t('processing') || '處理中...',
        success: hide ? t('hideSuccess', selectedCount) || '已隱藏' : t('unhideSuccess', selectedCount) || '已取消隱藏',
        error: t('updateFailed') || '更新失敗'
      }
    );
    clearSelection();
  };

  const handleBatchDeleteClick = async () => {
    const ok = await confirm({
      title: '確定要刪除選取的照片嗎？',
      description: `此操作將會永久從系統中刪除這 ${selectedCount} 張照片，且無法復原。`,
      confirmText: '刪除',
      variant: 'destructive',
    });
    if (ok) {
      await feedback.promise(
        deletePhoto.mutateAsync(selectedIds),
        {
          loading: t('processing') || '處理中...',
          success: t('deleteSuccess'),
          error: t('deleteFailed') || '刪除失敗'
        }
      );
      clearSelection();
    }
  };

  return (
    <TopLayer
      type="popover"
      open={isVisible}
      onClose={clearSelection}
      className={cn(
        "bottom-0 left-0 right-0 top-auto w-full bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] pb-safe animate-in fade-in slide-in-from-bottom-4 duration-300",
        className
      )}
    >
      <div className="max-w-[1920px] mx-auto relative flex items-center justify-between gap-1.5 sm:gap-4 py-3 px-3 sm:px-6">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            id="exit-selection-btn"
            onClick={() => {
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
    </TopLayer>
  );
}
