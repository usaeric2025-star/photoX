import React, { memo, useState, useId } from 'react';
import { useSelection } from './SelectionContext';
import { useBatchActions } from './useBatchActions';
import { useClickOutside } from '@/hooks/core/useClickOutside';
import { 
  CheckSquare, 
  Square, 
  X, 
  Trash2, 
  Edit, 
  ChevronDown, 
  Sparkles,
  MousePointer2,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

// --- Sub-components ---

function SelectionCounter({ count, total }: { count: number; total?: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium border border-blue-100">
      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      已選取 {count} {total !== undefined && <span className="opacity-60 text-xs">/ {total}</span>}
    </div>
  );
}

function SelectionModeToggle() {
  const { state, toggleMode } = useSelection();
  const isBatchMode = state.mode === 'batch';

  return (
    <button
      onClick={toggleMode}
      className={`p-1.5 rounded-md transition-colors ${
        isBatchMode 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'hover:bg-gray-100 text-gray-500 border border-transparent'
      }`}
      title={isBatchMode ? "退出選取模式" : "進入選取模式"}
    >
      {isBatchMode ? <CheckSquare size={18} /> : <MousePointer2 size={18} />}
    </button>
  );
}

interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void | Promise<void>;
  color?: string;
  disabled?: boolean;
}

function BatchActionMenu({ disabled = false, selectedCount = 0 }: { disabled?: boolean; selectedCount?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const { batchDelete } = useBatchActions();
  const menuRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  const actions: ActionItem[] = [
    {
      id: 'delete',
      label: '批次刪除',
      icon: <Trash2 size={16} />,
      action: async () => {
        if (window.confirm('確定要刪除選取的照片嗎？此操作無法復原。')) {
          await batchDelete.mutateAsync();
          setIsOpen(false);
        }
      },
      color: 'text-red-600 hover:bg-red-50',
    },
    {
      id: 'edit',
      label: '批次編輯',
      icon: <Edit size={16} />,
      action: () => {
        window.location.href = '/admin/batch-edit';
        setIsOpen(false);
      },
    },
    {
      id: 'ai',
      label: 'AI 智能合組',
      icon: <Sparkles size={16} />,
      action: () => {
        setIsOpen(false);
        toast.info('正在啟動 AI 智能分析...');
      },
      color: 'text-purple-600 hover:bg-purple-50',
    },
  ];

  const isDisabled = disabled || selectedCount === 0;

  const anchorId = useId();
  const anchorName = `--batch-action-${anchorId.replace(/:/g, '')}`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        style={{ anchorName } as React.CSSProperties}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm"
      >
        <span>批次操作</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          style={{ positionAnchor: anchorName } as React.CSSProperties}
          className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-200"
        >
          <div className="py-1">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                disabled={action.disabled || isDisabled}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                  (action.disabled || isDisabled) ? 'opacity-40 cursor-not-allowed' : action.color || 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {action.icon}
                <span className="font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main component ---

interface SelectionToolbarProps {
  totalItems?: number;
  allIds?: string[];
  className?: string;
}

export const SelectionToolbar = memo(function SelectionToolbar({
  totalItems,
  allIds = [],
  className = '',
}: SelectionToolbarProps) {
  const { state, selectAll, clear, toggleMode } = useSelection();
  const { isPending, selectedCount } = useBatchActions();
  const isBatchMode = state.mode === 'batch';

  const isAllSelected = allIds.length > 0 && selectedCount === allIds.length;

  if (!isBatchMode && selectedCount === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-4 py-1.5 px-4 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] animate-in fade-in slide-in-from-bottom-2 duration-300 ${className}`}>
      <div className="flex items-center gap-3">
        <SelectionModeToggle />
        <SelectionCounter count={selectedCount} total={totalItems} />
      </div>
      
      <div className="h-4 w-px bg-gray-200 mx-1" />

      <div className="flex items-center gap-2">
        <button
          onClick={() => isAllSelected ? clear() : selectAll(allIds)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          title={isAllSelected ? "取消全選" : "全選當前"}
        >
          {isAllSelected ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} />}
          <span>{isAllSelected ? '取消全選' : '全選'}</span>
        </button>

        <button
          onClick={clear}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          title="清除選取"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {isPending && (
          <span className="text-xs font-medium text-blue-500 animate-pulse flex items-center gap-1">
            <span className="w-1 h-1 bg-blue-500 rounded-full" />
            處理中
          </span>
        )}
        <BatchActionMenu disabled={isPending} selectedCount={selectedCount} />
      </div>
    </div>
  );
});
