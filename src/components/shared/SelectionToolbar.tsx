import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { Sparkles, FolderPlus, Edit, EyeOff, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useGroupPhotosMutation, useUrlFilters, useAIAutoGrouping } from '@/hooks';
import { useUIStore, useIsAnyDialogOpen } from '@/store/useUIStore';
import { toast } from 'sonner';

interface SelectionToolbarProps {
  onAIIdentify?: (ids: string[]) => void;
  onBatchEdit?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  onHide?: (ids: string[]) => void | Promise<any>;
  onCopy?: (ids: string[]) => void | Promise<any>;
}

export function SelectionToolbar({
  onAIIdentify,
  onBatchEdit,
  onDelete,
  onHide,
}: SelectionToolbarProps) {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const isMultiSelect = useUIStore((s) => s.isMultiSelect);
  const update = useUIStore((s) => s.update);
  
  const [isMinimized, setIsMinimized] = useState(false);

  // Reset minimized state when starting new selection
  React.useEffect(() => {
    if (isMultiSelect) {
      setIsMinimized(false);
    }
  }, [isMultiSelect]);

  const [isGroupAlertOpen, groupAlert] = useDisclosure(false);
  const isAnyDialogOpen = useIsAnyDialogOpen();
  
  // Auto-minimize on scroll
  React.useEffect(() => {
    if (!isMultiSelect) return;
    
    const handleScroll = () => {
      if (!isMinimized) setIsMinimized(true);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMultiSelect, isMinimized]);

  const count = selectedIds.length;
  const ids = selectedIds;
  
  // No MutationObserver needed

  const groupMutation = useGroupPhotosMutation();
  const { handleAIAction } = useAIAutoGrouping();
  const { filters: urlFilters, setShowGroupsCollapsed } = useUrlFilters();

  if (isAnyDialogOpen || !isMultiSelect || count === 0) return null;

  const handleClear = () => {
    update({ isMultiSelect: false, selectedIds: [] });
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    onDelete(ids);
  };

  const handleGroup = async () => {
    if (ids.length <= 1) {
      groupAlert.open();
      return;
    }

    const currentIds = [...ids];
    const prevSelection = [...ids]; 
    const targetGroupId = crypto.randomUUID();
    
    try {
      await groupMutation.mutateAsync({ 
        photoIds: currentIds, 
        targetGroupId
      });
      handleClear(); 
      setShowGroupsCollapsed(true);
    } catch (err) {
      console.error(err);
      update({ isMultiSelect: true, selectedIds: prevSelection });
    }
  };

  const handleAI = async () => {
    if (onAIIdentify) {
      onAIIdentify(ids);
      handleClear();
      setShowGroupsCollapsed(true);
    } else {
      await handleAIAction(ids);
      handleClear();
      setShowGroupsCollapsed(true);
    }
  };

  return createPortal(
    <div className="fixed bottom-6 inset-x-0 z-header flex justify-center pointer-events-none px-4">
      <div 
        className={cn(
          "pointer-events-auto bg-slate-900/95 border border-slate-800 backdrop-blur rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 animate-fade-in",
          isMinimized ? "px-2 py-2" : "px-5 py-2.5"
        )}
      >
      <div 
        onClick={() => setIsMinimized(!isMinimized)}
        className={cn(
          "flex items-center justify-center rounded-full bg-blue-600 text-white font-bold transition-all cursor-pointer hover:bg-blue-500 active:scale-95 select-none",
          isMinimized ? "w-10 h-10 text-sm" : "w-7 h-7 text-xs ring-4 ring-blue-600/15"
        )}
        title={isMinimized ? "点击展开工具栏" : `已选择 ${count} 张照片 (点击收起)`}
      >
        {count}
      </div>

      {!isMinimized && (
        <div 
          className="flex items-center gap-3 animate-fade-in"
        >
          <div className="w-[1px] h-6 bg-slate-800" />
          <div className="flex items-center gap-1">
              <button
                onClick={handleAI}
                className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-purple-400 hover:text-white hover:bg-purple-600/20 active:scale-95 transition-all outline-none"
                title={count === 1 ? 'AI 智能识别' : 'AI 智能合组'}
              >
                <Sparkles size={17} />
              </button>

              <button
                onClick={handleGroup}
                disabled={groupMutation.isPending}
                className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-emerald-400 hover:text-white hover:bg-emerald-600/20 active:scale-95 transition-all disabled:opacity-50 outline-none"
                title="将选中的照片合组"
              >
                <FolderPlus size={17} />
              </button>

              {onBatchEdit && (
                <button
                  onClick={() => onBatchEdit(ids)}
                  className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-blue-400 hover:text-white hover:bg-blue-600/20 active:scale-95 transition-all outline-none"
                  title="批量修改属性"
                >
                  <Edit size={17} />
                </button>
              )}

              {onHide && (
                <button
                  onClick={() => onHide(ids)}
                  className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-amber-400 hover:text-white hover:bg-amber-600/20 active:scale-95 transition-all outline-none"
                  title="批量隐藏"
                >
                  <EyeOff size={17} />
                </button>
              )}

              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-rose-400 hover:text-white hover:bg-rose-600/20 active:scale-95 transition-all outline-none"
                  title="批量删除"
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          </div>
        )}

      <div className="w-[1px] h-6 bg-slate-800" />

      <button
        onClick={handleClear}
        className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800 active:scale-90 transition-all outline-none"
        title="关闭多选"
      >
        <X size={15} />
      </button>

      <ConfirmDialog
        open={isGroupAlertOpen}
        onOpenChange={groupAlert.toggle}
        title="无法合组"
        description="请至少选择两张照片才能进行合组。"
        onConfirm={() => {}}
      />
      </div>
    </div>,
    document.body
  );
}
