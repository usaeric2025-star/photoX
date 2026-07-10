import React, { memo } from 'react';
import { useSelectionCount, useSelectedIds, useSelectionActions, useIsMultiSelect, usePermission } from '#src/hooks/index.js';
import { useAdminMaintenance } from '#src/hooks/admin/useAdminMaintenance.js';
import { useUI, type UIStoreState, useSignal, activeTaskCountSignal } from '#lib/store/index.js';
import { useAppRouter } from '#lib/router/index.js';
import { useAIBatchAnalysis } from '#src/hooks/photo/usePhotoAI.js';
import { useConfirm } from '#src/context/ConfirmContext.js';
import { useMediaQuery } from '#src/hooks/index.js';
import { useGroupPhotosMutation, useRemoveFromGroupMutation } from '#src/hooks/group/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { SelectionToolbarActions } from './components/SelectionToolbarActions.js';
import { api } from '#lib/api.js';

// --- Sub-components ---

function SelectionCounter({ count }: { count: number }) {
  return (
    <div className="text-sm font-semibold text-slate-700 select-none shrink-0 transition-all flex items-center pr-1 bg-transparent">
      {count}
    </div>
  );
}

// --- Main component ---

export function SelectionToolbar({ className = '', groupId: propGroupId }: { className?: string; groupId?: string }) {
  const selectedCount = useSelectionCount();
  const selectedIds = useSelectedIds();
  const isMultiSelect = useIsMultiSelect();
  const { clearSelection, patch, toggleMode } = useSelectionActions();
  
  const { deletePhoto, batchUpdate } = useAdminMaintenance();
  // const patch = useUI((s: UIStoreState) => s.patch); // Removed
  const { navigate } = useAppRouter();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const confirm = useConfirm();

  const combineMutation = useGroupPhotosMutation();
  const removeMutation = useRemoveFromGroupMutation();

  // Smart groupId detection from URL if not provided
  const groupId = React.useMemo(() => {
    if (propGroupId) return propGroupId;
    if (typeof window === 'undefined') return undefined;
    const path = window.location.pathname;
    const match = path.match(/\/(admin\/)?group\/([^\/]+)/);
    return match ? match[2] : undefined;
  }, [propGroupId]);

  // ✅ 使用計算後的 Selector
  const activeTasks = useSignal(activeTaskCountSignal);
  const isAnyPending = deletePhoto.isPending || batchUpdate.isPending || combineMutation.isPending || removeMutation.isPending;

  const isVisible = isMultiSelect || selectedCount > 0;

  React.useEffect(() => {
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
    patch({ batchEditingIds: selectedIds });
    navigate.adminBatchEdit();
  };

  const handleManualGroup = async () => {
    if (selectedCount === 0 || isAnyPending) return;
    
    const idsToGroup = [...selectedIds];
    const count = selectedCount;
    
    // Clear selection immediately for a responsive feel
    clearSelection();
    
    try {
      await combineMutation.mutateAsync({ photoIds: idsToGroup });
    } catch (err: unknown) {
      // Errors handled by mutation hook
    }
  };

  const handleRemoveFromGroup = async () => {
    if (selectedCount === 0 || isAnyPending || !groupId) return;
    
    const idsToRemove = [...selectedIds];
    
    // Clear selection immediately
    clearSelection();
    
    try {
      await removeMutation.mutateAsync({ photoIds: idsToRemove, groupId });
    } catch (err: unknown) {
      // Errors handled by mutation hook
    }
  };

  const handleBatchDeleteClick = async () => {
    if (selectedCount === 0 || isAnyPending) return;

    const ok = await confirm({
      title: '確定要刪除選取的照片嗎？',
      description: `此操作將會永久從系統中刪除這 ${selectedCount} 張照片，且無法復原。`,
      confirmText: '刪除',
      variant: 'destructive',
    });

    if (ok) {
      await deletePhoto.mutateAsync(selectedIds);
      clearSelection();
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 w-full bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] pb-safe animate-in fade-in slide-in-from-bottom-4 duration-300 ${className}`}>
      <div className="max-w-[1920px] mx-auto relative flex items-center justify-between gap-1.5 sm:gap-4 py-3 px-3 sm:px-6">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* 關閉/清除選擇 */}
          <button
            onClick={() => {
              if (isMultiSelect) {
                toggleMode();
              }
              clearSelection();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            title="清除並退出選取"
          >
            <Icon name="x" size={18} />
          </button>

          {/* 計數顯示 */}
          <SelectionCounter count={selectedCount} />
        </div>

        {/* 絕對定位的中央處理中狀態，防止工具列按鈕變形 */}
        {isAnyPending && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <LoadingSpinner size="xs" className="text-blue-500" />
            <span className="hidden xs:inline">正在處理中...</span>
            <span className="xs:hidden">處理中...</span>
          </div>
        )}

        {/* 行動按鈕組 */}
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
        />
      </div>
    </div>
  );
}

