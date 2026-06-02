import React from 'react';
import { Trash2, Sparkles, Edit, X, FolderPlus, EyeOff } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useGroupPhotosMutation } from '@/hooks';
import { useAIGroup } from '@/hooks/core/mutations/useAIGroup';

interface SelectionToolbarProps {
  onAIIdentify?: (ids: string[]) => void;
  onBatchEdit?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  onHide?: (ids: string[]) => Promise<any>;
  onCopy?: (ids: string[]) => Promise<any>;
}

export function SelectionToolbar({
  onAIIdentify,
  onBatchEdit,
  onDelete,
  onHide,
}: SelectionToolbarProps) {
  const selectedIds = useUIStore(s => s.selectedIds);
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const update = useUIStore(s => s.update);
  
  const count = selectedIds.length;
  const ids = selectedIds;

  const groupMutation = useGroupPhotosMutation();
  const { handleAIAction } = useAIGroup();

  if (!isMultiSelect || count === 0) return null;

  const handleClear = () => {
    update({ isMultiSelect: false, selectedIds: [] });
  };

  const handleGroup = async () => {
    const currentIds = [...ids];
    const targetGroupId = crypto.randomUUID();
    handleClear(); // 立即清除选择状态，提升即时感
    try {
      await groupMutation.mutateAsync({ photoIds: currentIds, targetGroupId });
    } catch (err) {
      console.error(err);
      // 如果失败可以考虑恢复状态，但通常简单刷新更稳健
    }
  };

  const handleAI = () => {
    if (onAIIdentify) {
      onAIIdentify(ids);
    } else {
      handleAIAction(ids);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-800 backdrop-blur rounded-full px-4 py-2 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Circle Badge showing selection count */}
      <div 
        className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs ring-4 ring-blue-600/15 shrink-0 select-none cursor-default"
        title={`已选择 ${count} 张照片`}
      >
        {count}
      </div>

      {/* Vertical divider */}
      <div className="w-[1px] h-6 bg-slate-800" />

      {/* Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleAI}
          className="w-9 h-9 flex items-center justify-center rounded-full text-purple-400 hover:text-white hover:bg-purple-600/20 active:scale-95 transition-all"
          title={count === 1 ? 'AI 智能识别' : 'AI 智能合组'}
        >
          <Sparkles size={17} />
        </button>

        <button
          onClick={handleGroup}
          disabled={groupMutation.isPending}
          className="w-9 h-9 flex items-center justify-center rounded-full text-emerald-400 hover:text-white hover:bg-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
          title="将选中的照片合组"
        >
          <FolderPlus size={17} />
        </button>

        {onBatchEdit && (
          <button
            onClick={() => onBatchEdit(ids)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-blue-400 hover:text-white hover:bg-blue-600/20 active:scale-95 transition-all"
            title="批量修改属性"
          >
            <Edit size={17} />
          </button>
        )}

        {onHide && (
          <button
            onClick={() => onHide(ids)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-amber-400 hover:text-white hover:bg-amber-600/20 active:scale-95 transition-all"
            title="批量隐藏"
          >
            <EyeOff size={17} />
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => onDelete(ids)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-rose-400 hover:text-white hover:bg-rose-600/20 active:scale-95 transition-all"
            title="批量删除"
          >
            <Trash2 size={17} />
          </button>
        )}
      </div>

      {/* Vertical divider */}
      <div className="w-[1px] h-6 bg-slate-800" />

      {/* Cancel button */}
      <button
        onClick={handleClear}
        className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800 active:scale-90 transition-all"
        title="关闭多选"
      >
        <X size={15} />
      </button>
    </div>
  );
}
