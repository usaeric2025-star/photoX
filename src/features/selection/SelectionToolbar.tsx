import React, { memo } from 'react';
import { useSelection } from './SelectionContext';
import { useBatchActions } from './useBatchActions';
import { useUIStore } from '@/store/useUIStore';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useAIBatchAnalysis } from '@/hooks/photo/useAIBatchAnalysis';
import { useConfirm } from '@/context/ConfirmContext';
import { useMediaQuery } from '@/hooks';
import { useGroupPhotosMutation, useRemoveFromGroupMutation } from '@/hooks/groups/useGroupMutations';
import { Photo } from '@/types';
import { 
  CheckSquare, 
  Square, 
  X, 
  Trash2, 
  Edit, 
  Sparkles,
  Loader2,
  FolderPlus,
  FolderMinus
} from 'lucide-react';

// --- Sub-components ---

function SelectionCounter({ count, total }: { count: number; total?: number }) {
  return (
    <div className="text-sm font-semibold text-slate-700 select-none shrink-0 transition-all flex items-center pr-1 bg-transparent">
      {count} {total !== undefined && <span className="text-slate-400 font-normal ml-1">/ {total}</span>}
    </div>
  );
}

// --- Main component ---

interface SelectionToolbarProps {
  totalItems?: number;
  allIds?: string[];
  className?: string;
  allPhotos?: Photo[];
  groupId?: string;
}

export const SelectionToolbar = memo(function SelectionToolbar({
  totalItems,
  allIds = [],
  className = '',
  allPhotos = [],
  groupId,
}: SelectionToolbarProps) {
  const { state, selectAll, clear } = useSelection();
  const { isPending, batchDelete } = useBatchActions();
  const update = useUIStore((s) => s.update);
  const routerSafe = useRouterSafe();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const confirm = useConfirm();

  const combineMutation = useGroupPhotosMutation();
  const removeMutation = useRemoveFromGroupMutation();

  const [isAiPending, setIsAiPending] = React.useState(false);
  const isAnyPending = isPending || isAiPending || combineMutation.isPending || removeMutation.isPending;

  // Media Query Subscriptions
  const isSm = useMediaQuery('(min-width: 640px)');
  const isMd = useMediaQuery('(min-width: 768px)');

  const isBatchMode = state.mode === 'batch';
  const selectedCount = state.selectedIds.length;
  const isAllSelected = allIds.length > 0 && selectedCount === allIds.length;

  // Find actual Photo objects corresponding to selectedIds
  const selectedPhotos = React.useMemo(() => {
    if (!allPhotos || allPhotos.length === 0) return [];
    return allPhotos.filter((p) => state.selectedIds.includes(p.id));
  }, [allPhotos, state.selectedIds]);

  if (!isBatchMode && selectedCount === 0) {
    return null;
  }

  const handleBatchEdit = () => {
    if (selectedCount === 0 || isAnyPending) return;
    update({ batchEditingIds: state.selectedIds });
    routerSafe.navigate({ to: '/admin/batch-edit' });
  };

  const handleBatchAiGroup = async () => {
    if (selectedCount === 0 || isAnyPending) return;
    try {
      setIsAiPending(true);
      await handleBatchAiAnalyze(selectedPhotos, groupId);
    } finally {
      setIsAiPending(false);
    }
  };

  const handleManualGroup = async () => {
    if (selectedCount === 0 || isAnyPending) return;
    await combineMutation.mutateAsync({ photoIds: state.selectedIds });
    clear();
  };

  const handleRemoveFromGroup = async () => {
    if (selectedCount === 0 || isAnyPending || !groupId) return;
    await removeMutation.mutateAsync({ photoIds: state.selectedIds, groupId });
    clear();
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
      await batchDelete.mutateAsync();
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 w-full bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] pb-safe animate-in fade-in slide-in-from-bottom-4 duration-300 ${className}`}>
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-1.5 sm:gap-4 py-3 px-3 sm:px-6">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* 關閉/清除選擇 */}
          <button
            onClick={clear}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            title="清除並退出選取"
          >
            <X size={18} />
          </button>

          {/* 計數顯示 */}
          <SelectionCounter count={selectedCount} total={totalItems} />

          {/* 全選切換 */}
          <button
            onClick={() => isAllSelected ? clear() : selectAll(allIds)}
            className="flex items-center gap-1 px-1.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            title={isAllSelected ? "取消全選" : "全選當前"}
          >
            {isAllSelected ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} />}
            {isSm && (
              <span className="ml-1 shrink-0">{isAllSelected ? '取消全選' : '全選'}</span>
            )}
          </button>
        </div>

        {/* 行動按鈕組 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAnyPending && (
            <span className="text-xs font-semibold text-blue-500 animate-pulse flex items-center gap-1 mr-1 select-none shrink-0">
              <Loader2 size={12} className="animate-spin" />
              處理中
            </span>
          )}

          {/* 移出合組 (僅在合組頁面時顯示) */}
          {groupId && (
            <button
              onClick={handleRemoveFromGroup}
              disabled={selectedCount === 0 || isAnyPending}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
              title="將照片移出此合組"
            >
              {removeMutation.isPending ? (
                <Loader2 size={14} className="animate-spin text-amber-600 shrink-0" />
              ) : (
                <FolderMinus size={14} className="text-amber-600 shrink-0" />
              )}
              <span className="shrink-0">
                {isMd ? '移出合組' : isSm ? '移出' : '移出'}
              </span>
            </button>
          )}

          {/* 手動合組 (在合組頁面時不顯示此功能) */}
          {!groupId && (
            <button
              onClick={handleManualGroup}
              disabled={selectedCount === 0 || isAnyPending}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
              title="手動將照片合併為一組"
            >
              {combineMutation.isPending ? (
                <Loader2 size={14} className="animate-spin text-blue-600 shrink-0" />
              ) : (
                <FolderPlus size={14} className="text-blue-600 shrink-0" />
              )}
              <span className="shrink-0">
                {isMd ? '手動合組' : isSm ? '手動合組' : '合組'}
              </span>
            </button>
          )}

          {/* AI 智能合組 (在合組頁面時不顯示此功能) */}
          {!groupId && (
            <button
              onClick={handleBatchAiGroup}
              disabled={selectedCount === 0 || isAnyPending}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
              title="AI 智能分析合組"
            >
              {isAiPending ? (
                <Loader2 size={14} className="animate-spin text-purple-600 shrink-0" />
              ) : (
                <Sparkles size={14} className="text-purple-600 animate-pulse shrink-0" />
              )}
              <span className="shrink-0">
                {isMd ? 'AI 智能合組' : isSm ? 'AI 合組' : 'AI'}
              </span>
            </button>
          )}

          {/* 批量編輯 */}
          <button
            onClick={handleBatchEdit}
            disabled={selectedCount === 0 || isAnyPending}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
            title="批次編輯欄位"
          >
            <Edit size={14} className="text-indigo-600 shrink-0" />
            <span className="shrink-0">
              {isMd ? '批次編輯' : isSm ? '編輯' : '編輯'}
            </span>
          </button>

          {/* 批量刪除 */}
          <button
            onClick={handleBatchDeleteClick}
            disabled={selectedCount === 0 || isAnyPending}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
            title="批次刪除照片"
          >
            {batchDelete.isPending ? (
              <Loader2 size={14} className="animate-spin text-red-500 shrink-0" />
            ) : (
              <Trash2 size={14} className="text-red-500 shrink-0" />
            )}
            <span className="shrink-0">
              {isMd ? '批次刪除' : isSm ? '刪除' : '刪除'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});
