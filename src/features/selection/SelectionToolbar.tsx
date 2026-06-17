import React, { memo } from 'react';
import { useSelection } from './SelectionContext';
import { useBatchActions } from './useBatchActions';
import { useUIStore } from '@/store/useUIStore';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useAIBatchAnalysis } from '@/hooks/photo/useAIBatchAnalysis';
import { useConfirm } from '@/context/ConfirmContext';
import { useMediaQuery } from '@/hooks';
import { Photo } from '@/types';
import { 
  CheckSquare, 
  Square, 
  X, 
  Trash2, 
  Edit, 
  Sparkles,
  Loader2
} from 'lucide-react';

// --- Sub-components ---

function SelectionCounter({ count, total }: { count: number; total?: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100 select-none shrink-0 transition-all">
      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0" />
      已選 {count} {total !== undefined && <span className="opacity-60 text-[10px]">/ {total}</span>}
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

  // Media Query Subscriptions
  const isSm = useMediaQuery('(min-width: 640px)');
  const isMd = useMediaQuery('(min-width: 768px)');

  const isBatchMode = state.mode === 'batch';
  const selectedCount = state.selectedIds.length;
  const isAllSelected = allIds.length > 0 && selectedCount === allIds.length;

  if (!isBatchMode && selectedCount === 0) {
    return null;
  }

  // Find actual Photo objects corresponding to selectedIds
  const selectedPhotos = React.useMemo(() => {
    if (!allPhotos || allPhotos.length === 0) return [];
    return allPhotos.filter((p) => state.selectedIds.includes(p.id));
  }, [allPhotos, state.selectedIds]);

  const handleBatchEdit = () => {
    if (selectedCount === 0) return;
    update({ batchEditingIds: state.selectedIds });
    routerSafe.navigate({ to: '/admin/batch-edit' });
  };

  const handleBatchAiGroup = async () => {
    if (selectedCount === 0) return;
    await handleBatchAiAnalyze(selectedPhotos, groupId);
  };

  const handleBatchDeleteClick = async () => {
    if (selectedCount === 0) return;

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
          {isPending && (
            <span className="text-xs font-semibold text-blue-500 animate-pulse flex items-center gap-1 mr-1 select-none shrink-0">
              <Loader2 size={12} className="animate-spin" />
              處理中
            </span>
          )}

          {/* AI 智能合組 */}
          <button
            onClick={handleBatchAiGroup}
            disabled={selectedCount === 0 || isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
            title="AI 智能分析合組"
          >
            <Sparkles size={14} className="text-purple-600 animate-pulse shrink-0" />
            <span className="shrink-0">
              {isMd ? 'AI 智能合組' : isSm ? 'AI 合組' : 'AI'}
            </span>
          </button>

          {/* 批量編輯 */}
          <button
            onClick={handleBatchEdit}
            disabled={selectedCount === 0 || isPending}
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
            disabled={selectedCount === 0 || isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
            title="批次刪除照片"
          >
            <Trash2 size={14} className="text-red-500 shrink-0" />
            <span className="shrink-0">
              {isMd ? '批次刪除' : isSm ? '刪除' : '刪除'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});
