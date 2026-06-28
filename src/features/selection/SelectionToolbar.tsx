import React, { memo } from 'react';
import { useSelection } from './useSelection';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { useUI, type UIStoreState, useSignal, activeTaskCountSignal } from '@/lib/store';
import { useAppRouter } from '@/lib/router';
import { useAIBatchAnalysis } from '@/hooks/photo/useAIBatchAnalysis';
import { useConfirm } from '@/context/ConfirmContext';
import { useMediaQuery } from '@/hooks';
import { useGroupPhotosMutation, useRemoveFromGroupMutation } from '@/hooks/groups/useGroupMutations';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner';
import { SelectionToolbarActions } from './components/SelectionToolbarActions';

// --- Sub-components ---

function SelectionCounter({ count }: { count: number }) {
  return (
    <div className="text-sm font-semibold text-slate-700 select-none shrink-0 transition-all flex items-center pr-1 bg-transparent">
      {count}
    </div>
  );
}

// --- Main component ---

export function SelectionToolbar({ className = '', groupId }: { className?: string; groupId?: string }) {
  const { selectedCount, selectedIds, clearSelection, isMultiSelect, patch, batchEditingIds, isAvoidingSelection } = useSelection();
  const { deletePhoto, batchUpdate } = useAdminMaintenance();
  // const patch = useUI((s: UIStoreState) => s.patch); // Removed
  const { navigate } = useAppRouter();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const confirm = useConfirm();

  const combineMutation = useGroupPhotosMutation();
  const removeMutation = useRemoveFromGroupMutation();

  // ✅ 使用計算後的 Selector
  const activeTasks = useSignal(activeTaskCountSignal);
  const isAnyPending = deletePhoto.isMutating || batchUpdate.isMutating || activeTasks > 0 || combineMutation.isMutating || removeMutation.isMutating;
  // const setAvoidingSelection = useUI((s: UIStoreState) => s.setAvoidingSelection); // Removed
  const setAvoidingSelection = (isAvoiding: boolean) => patch({ isAvoidingSelection: isAvoiding });

  const isVisible = isMultiSelect || selectedCount > 0;

  React.useEffect(() => {
    if (isVisible) {
      setAvoidingSelection(true);
      return () => setAvoidingSelection(false);
    }
  }, [isVisible, setAvoidingSelection]);

  // Media Query Subscriptions
  const isSm = useMediaQuery('(min-width: 640px)');
  const isMd = useMediaQuery('(min-width: 768px)');

  if (!isVisible) {
    return null;
  }

  const handleBatchEdit = () => {
    if (selectedCount === 0 || isAnyPending) return;
    patch({ batchEditingIds: selectedIds });
    navigate.adminBatchEdit();
  };

  const handleBatchAiGroup = async () => {
    if (selectedCount === 0 || isAnyPending) return;
    // Note: We might need to adjust this as we don't have allPhotos anymore easily
    await handleBatchAiAnalyze([], groupId); // This might need fixing to pass photos
  };

  const handleManualGroup = async () => {
    if (selectedCount === 0 || isAnyPending) return;
    await combineMutation.mutateAsync({ photoIds: selectedIds });
    clearSelection();
  };

  const handleRemoveFromGroup = async () => {
    if (selectedCount === 0 || isAnyPending || !groupId) return;
    await removeMutation.mutateAsync({ photoIds: selectedIds, groupId });
    clearSelection();
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
            onClick={clearSelection}
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
          isRemoving={removeMutation.isMutating}
          isCombining={combineMutation.isMutating}
          activeTasks={activeTasks}
          isDeleting={deletePhoto.isMutating}
          onRemoveFromGroup={handleRemoveFromGroup}
          onManualGroup={handleManualGroup}
          onBatchAiGroup={handleBatchAiGroup}
          onBatchEdit={handleBatchEdit}
          onBatchDelete={handleBatchDeleteClick}
        />
      </div>
    </div>
  );
}

