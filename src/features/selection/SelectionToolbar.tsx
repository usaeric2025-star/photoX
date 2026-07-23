import { useAtomValue } from "jotai";
import React, { memo, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  useSelectionCount, 
  useSelectedIds, 
  useSelectionActions, 
  useIsMultiSelect, 
  useIsExitingSelection,
  usePermission, 
  useAdminActions, 
  useTranslation 
} from '#src/hooks/index.js';
import { feedback } from '#lib/feedback.js';
import { activeTaskCountAtom } from '#lib/store/index.js';
import { useNormalizedLocation } from '#src/hooks/core/index.js';
import { useConfirm } from '#src/context/ConfirmContext.js';
import { useMediaQuery, usePhotoMutations } from '#src/hooks/index.js';
import { useGroupMutations } from '#src/hooks/group/index.js';
import { cn } from '#lib/utils.js';
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
 * 批量操作工具栏，采用防穿透 + 状态分层，提供清晰的界面响应与状态恢复。
 */
export function SelectionToolbar({ className = '', groupId: propGroupId }: { className?: string; groupId?: string }) {
  const selectedCount = useSelectionCount();
  const selectedIds = useSelectedIds();
  const isMultiSelect = useIsMultiSelect();
  const isExiting = useIsExitingSelection();
  const { clearSelection, patch } = useSelectionActions();
  
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
  const { manualGroupAsync, isGrouping } = usePhotoMutations();
  const isAnyPending = deletePhoto.isPending || batchUpdate.isPending || combineMutation.isPending || removeMutation.isPending || isGrouping;
  const isVisible = isMultiSelect || selectedCount > 0;

  useEffect(() => {
    if (isVisible) {
      patch({ isAvoidingSelection: true });
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          clearSelection();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        patch({ isAvoidingSelection: false });
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isVisible, patch, clearSelection]);

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
    setLocation('/admin/batch-edit', { state: { selectedIds: [...selectedIds] } });
  };

  const handleManualGroup = async () => {
    if (selectedCount < 2 || isAnyPending) return;
    
    try {
      const targetGroupId = crypto.randomUUID();
      const idsToGroup = [...selectedIds]; // 捕捉当前的内存 ID 快照
      await manualGroupAsync({ photoIds: idsToGroup, groupId: targetGroupId });
      clearSelection();
    } catch (err) {
      // Error handled by mutation onError
    }
  };

  const handleRemoveFromGroup = async () => {
    if (selectedCount === 0 || isAnyPending || !groupId) return;
    const idsToRemove = [...selectedIds];
    clearSelection();
    await feedback.promise(
      removeMutation.mutateAsync({ photoIds: idsToRemove, groupId }),
      {
        loading: t('processing') || '处理中...',
        success: t('removePhotosSuccess', idsToRemove.length),
        error: t('removePhotosFailed') || '移出失败'
      }
    );
  };

  const handleBatchToggleHide = async (hide: boolean) => {
    if (selectedCount === 0 || isAnyPending) return;
    const idsToToggle = [...selectedIds];
    clearSelection();
    await feedback.promise(
      batchUpdate.mutateAsync({ ids: idsToToggle, updates: { isHidden: hide } }),
      {
        loading: t('processing') || '处理中...',
        success: hide ? t('hideSuccess', idsToToggle.length) || '已隐藏' : t('unhideSuccess', idsToToggle.length) || '已取消隐藏',
        error: t('updateFailed') || '更新失败'
      }
    );
  };

  const handleBatchDeleteClick = async () => {
    const idsToDelete = [...selectedIds];
    const ok = await confirm({
      title: '确定要删除选取的照片吗？',
      description: `此操作将会永久从系统中删除这 ${idsToDelete.length} 张照片，且无法复原。`,
      confirmText: '删除',
      variant: 'destructive',
    });
    if (ok) {
      clearSelection();
      await feedback.promise(
        deletePhoto.mutateAsync(idsToDelete),
        {
          loading: t('processing') || '处理中...',
          success: t('deleteSuccess') || '删除成功',
          error: t('deleteFailed') || '删除失败'
        }
      );
    }
  };

  const blockEvents = (e: React.UIEvent) => {
    e.stopPropagation();
  };

  return createPortal(
    <div
      onClick={blockEvents}
      onMouseDown={blockEvents}
      onTouchStart={blockEvents}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 w-full bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] pb-safe animate-in fade-in slide-in-from-bottom-4 duration-300",
        isExiting && "pointer-events-none opacity-50",
        className
      )}
    >
      <div className="max-w-[1920px] mx-auto relative flex items-center justify-between gap-1.5 sm:gap-4 py-3 px-3 sm:px-6">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            id="exit-selection-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0 outline-none"
            title="清除并退出选取"
          >
            <Icon name="x" size={18} />
          </button>
          <SelectionCounter count={selectedCount} />
        </div>

        {isAnyPending && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <LoadingSpinner size="xs" className="text-blue-500" />
            <span className="hidden xs:inline">正在处理中...</span>
            <span className="xs:hidden">处理中...</span>
          </div>
        )}

        <SelectionToolbarActions
          selectedCount={selectedCount}
          isAnyPending={isAnyPending}
          groupId={groupId}
          isSm={isSm}
          isMd={isMd}
          isRemoving={removeMutation.isPending}
          isCombining={combineMutation.isPending || isGrouping}
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
    </div>,
    document.body
  );
}

