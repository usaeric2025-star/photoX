import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';

interface SelectionToolbarActionsProps {
  selectedCount: number;
  isAnyPending: boolean;
  groupId?: string;
  isSm: boolean;
  isMd: boolean;
  isRemoving: boolean;
  isCombining: boolean;
  activeTasks: number;
  isDeleting: boolean;
  onRemoveFromGroup: () => void;
  onManualGroup: () => void;
  onBatchEdit: () => void;
  onBatchDelete: () => void;
  onBatchToggleHide: (hide: boolean) => void;
  isUpdating: boolean;
  onBatchAiIdentify: () => void;
  isAiAnalyzing: boolean;
}

/**
 * SelectionToolbarActions
 * 
 * 批量操作工具欄的動作按鈕組。
 */
export function SelectionToolbarActions({
  selectedCount,
  isAnyPending,
  groupId,
  isSm,
  isMd,
  isRemoving,
  isCombining,
  isDeleting,
  onRemoveFromGroup,
  onManualGroup,
  onBatchEdit,
  onBatchDelete,
  onBatchToggleHide,
  isUpdating,
  onBatchAiIdentify,
  isAiAnalyzing,
}: SelectionToolbarActionsProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      {/* 移出合組 (僅在合組頁面時顯示) */}
      {groupId && (
        <button
          id="remove-from-group-btn"
          onClick={(e) => { e.stopPropagation(); onRemoveFromGroup(); }}
          disabled={selectedCount === 0 || isAnyPending}
          className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm outline-none"
          title="將照片移出此合組"
        >
          {isRemoving ? (
            <LoadingSpinner size="xs" className="text-amber-600 shrink-0" />
          ) : (
            <Icon name="folder-minus" size={14} className="text-amber-600 shrink-0" />
          )}
          <span className="shrink-0">
            {isMd ? '移出合組' : '移出'}
          </span>
        </button>
      )}

      {/* 手動合組 (在合組頁面時不顯示此功能) */}
      {!groupId && (
        <button
          id="combine-photos-btn"
          onClick={(e) => { e.stopPropagation(); onManualGroup(); }}
          disabled={isAnyPending}
          className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all border active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm outline-none ${
            selectedCount < 2
              ? "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
              : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
          }`}
          title={selectedCount < 2 ? "請至少選取兩張照片以進行合組" : "手動將照片合併為一組"}
        >
          {isCombining ? (
            <LoadingSpinner size="xs" className="text-blue-600 shrink-0" />
          ) : (
            <Icon name="folder-plus" size={14} className={selectedCount < 2 ? "text-slate-500 shrink-0" : "text-blue-600 shrink-0"} />
          )}
          <span className="shrink-0">
            {isMd ? '手動合組' : '合組'}
          </span>
        </button>
      )}

      {/* AI 智能識別 */}
      <button
        id="batch-ai-btn"
        onClick={(e) => { e.stopPropagation(); onBatchAiIdentify(); }}
        disabled={selectedCount === 0 || isAnyPending || isAiAnalyzing}
        className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm outline-none"
        title="AI 智能識別選取的照片"
      >
        {isAiAnalyzing ? (
          <LoadingSpinner size="xs" className="text-purple-600 shrink-0" />
        ) : (
          <Icon name="sparkles" size={14} className="text-purple-600 shrink-0" />
        )}
        <span className="shrink-0">
          {isMd ? 'AI 識別' : 'AI'}
        </span>
      </button>

      {/* 批量隱藏 */}
      <button
        id="batch-hide-btn"
        onClick={(e) => { e.stopPropagation(); onBatchToggleHide(true); }}
        disabled={selectedCount === 0 || isAnyPending}
        className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm outline-none"
        title="隱藏照片"
      >
        {isUpdating ? (
          <LoadingSpinner size="xs" className="text-slate-600 shrink-0" />
        ) : (
          <Icon name="eye-off" size={14} className="text-slate-600 shrink-0" />
        )}
        <span className="hidden sm:inline shrink-0">
          {isMd ? '隱藏' : '隱藏'}
        </span>
      </button>

      {/* 批量編輯 */}
      <button
        id="batch-edit-btn"
        onClick={(e) => { e.stopPropagation(); onBatchEdit(); }}
        disabled={selectedCount === 0 || isAnyPending}
        className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm outline-none"
        title="編輯選取項目"
      >
        <Icon name="edit" size={14} className="text-indigo-600 shrink-0" />
        <span className="shrink-0">
          {isMd ? '批量編輯' : '編輯'}
        </span>
      </button>

      {/* 批量刪除 */}
      <button
        id="batch-delete-btn"
        onClick={(e) => { e.stopPropagation(); onBatchDelete(); }}
        disabled={selectedCount === 0 || isAnyPending}
        className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm outline-none"
        title="批次刪除照片"
      >
        {isDeleting ? (
          <LoadingSpinner size="xs" className="text-red-500 shrink-0" />
        ) : (
          <Icon name="trash-2" size={14} className="text-red-500 shrink-0" />
        )}
        <span className="shrink-0">
          {isMd ? '批次刪除' : '刪除'}
        </span>
      </button>
    </div>
  );
}
