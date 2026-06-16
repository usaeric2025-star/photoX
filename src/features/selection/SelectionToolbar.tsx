import React, { memo, useState } from 'react';
import { useSelection } from './SelectionContext';
import { useBatchActions } from './useBatchActions';
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
  const { state, clear } = useSelection();
  const isBatchMode = state.mode === 'batch';

  return (
    <button
      onClick={clear}
      className={`p-1.5 rounded-md transition-colors ${
        isBatchMode 
          ? 'bg-blue-100 text-blue-600' 
          : 'hover:bg-gray-100 text-gray-500'
      }`}
      title={isBatchMode ? "退出批次模式" : "批次選取模式"}
    >
      {isBatchMode ? <Layers size={18} /> : <MousePointer2 size={18} />}
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

function BatchActionMenu({ disabled = false }: { disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const { batchDelete } = useBatchActions();

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

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm"
      >
        <span>批次操作</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="py-1">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                disabled={action.disabled || disabled}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                  action.disabled ? 'opacity-40 cursor-not-allowed' : action.color || 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {action.icon}
                <span className="font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {isOpen && <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />}
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
  const { state, selectAll, clear } = useSelection();
  const { isPending, selectedCount } = useBatchActions();

  const isAllSelected = allIds.length > 0 && selectedCount === allIds.length;

  if (selectedCount === 0) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <SelectionModeToggle />
        <span className="text-sm font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
          共 {totalItems ?? 0} 項
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 py-1 animate-in fade-in slide-in-from-top-1 duration-200 ${className}`}>
      <div className="flex items-center gap-2">
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
        <BatchActionMenu disabled={isPending} />
      </div>
    </div>
  );
});
