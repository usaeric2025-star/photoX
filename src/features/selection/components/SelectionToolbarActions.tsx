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
}

export function SelectionToolbarActions({
  selectedCount,
  isAnyPending,
  groupId,
  isSm,
  isMd,
  isRemoving,
  isCombining,
  activeTasks,
  isDeleting,
  onRemoveFromGroup,
  onManualGroup,
  onBatchEdit,
  onBatchDelete,
}: SelectionToolbarActionsProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      {/* 移出合組 (僅在合組頁面時顯示) */}
      {groupId && (
        <button
          onClick={onRemoveFromGroup}
          disabled={selectedCount === 0 || isAnyPending}
          className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
          title="將照片移出此合組"
        >
          {isRemoving ? (
            <LoadingSpinner size="xs" className="text-amber-600 shrink-0" />
          ) : (
            <Icon name="folder-minus" size={14} className="text-amber-600 shrink-0" />
          )}
          <span className="shrink-0">
            {isMd ? '移出合組' : isSm ? '移出' : '移出'}
          </span>
        </button>
      )}

      {/* 手動合組 (在合組頁面時不顯示此功能) */}
      {!groupId && (
        <button
          onClick={onManualGroup}
          disabled={selectedCount < 2 || isAnyPending}
          className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
          title={selectedCount < 2 ? "請至少選取兩張照片以進行合組" : "手動將照片合併為一組"}
        >
          {isCombining ? (
            <LoadingSpinner size="xs" className="text-blue-600 shrink-0" />
          ) : (
            <Icon name="folder-plus" size={14} className="text-blue-600 shrink-0" />
          )}
          <span className="shrink-0">
            {isMd ? '手動合組' : isSm ? '手動合組' : '合組'}
          </span>
        </button>
      )}

      {/* 批量編輯 */}
      <button
        onClick={onBatchEdit}
        disabled={selectedCount === 0 || isAnyPending}
        className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
        title="編輯選取項目"
      >
        <Icon name="edit" size={14} className="text-indigo-600 shrink-0" />
        <span className="shrink-0">
          {isMd ? '編輯' : '編輯'}
        </span>
      </button>

      {/* 批量刪除 */}
      <button
        onClick={onBatchDelete}
        disabled={selectedCount === 0 || isAnyPending}
        className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-bold transition-all bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shadow-sm"
        title="批次刪除照片"
      >
        {isDeleting ? (
          <LoadingSpinner size="xs" className="text-red-500 shrink-0" />
        ) : (
          <Icon name="trash-2" size={14} className="text-red-500 shrink-0" />
        )}
        <span className="shrink-0">
          {isMd ? '批次刪除' : isSm ? '刪除' : '刪除'}
        </span>
      </button>
    </div>
  );
}
