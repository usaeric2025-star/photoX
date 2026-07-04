import React from 'react';
import { NativeDialog } from "#src/components/ui/NativeDialog.js";
import { Icon } from '#src/components/ui/Icon.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { Tag } from '#src/types/index.js';
import { useConfirm } from '#src/context/ConfirmContext.js';

interface TagActionDialogProps {
  activeTag: Tag | null;
  pinnedIds: string[];
  onClose: () => void;
  onTogglePin: (tagId: string) => void;
  onRenameRequest: (tag: Tag) => void;
  onDeleteTag: (id: string) => void;
}

export const TagActionDialog = ({
  activeTag,
  pinnedIds,
  onClose,
  onTogglePin,
  onRenameRequest,
  onDeleteTag
}: TagActionDialogProps) => {
  const confirm = useConfirm();

  if (!activeTag) return null;

  const isPinned = pinnedIds.includes(String(activeTag.id));

  return (
    <NativeDialog 
      id="tag-editor-dialog" 
      open={!!activeTag} 
      onClose={onClose} 
      hidePadding={false}
    >
      <div
        className="w-full max-w-[280px] space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            标签管理 / TAG
          </span>
          <div className="text-lg font-black text-slate-900">
            #{activeTag.name}
          </div>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 text-amber-600 bg-amber-50 border border-amber-100/50 font-bold py-4 rounded-2xl hover:bg-amber-100 transition-all cursor-pointer shadow-sm shadow-amber-500/5"
            onClick={() => {
              onTogglePin(String(activeTag.id));
              onClose();
            }}
          >
            <Icon name="heart"
              size={18}
              strokeWidth={2.5}
              className={isPinned ? "fill-amber-600" : ""}
            />
            {isPinned ? "取消置顶 / Unpin" : "设为置顶 / Pin as Hot"}
          </button>
          
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 text-blue-600 bg-blue-50 border border-blue-100/50 font-bold py-4 rounded-2xl hover:bg-blue-100 transition-all cursor-pointer shadow-sm shadow-blue-500/5"
            onClick={() => {
              onRenameRequest(activeTag);
              onClose();
            }}
          >
            <Icon name="pencil" size={18} strokeWidth={2.5} /> 编辑名称 / Rename
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 text-red-600 bg-red-50 border border-red-100/50 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all cursor-pointer shadow-sm shadow-red-500/5"
            onClick={async () => {
              if (await confirm({
                title: `彻底删除标签 / Permanent Delete: #${activeTag.name}`,
                description: "无法撤销且会从所有照片中移除 / This will be permanently removed from all photos.",
                confirmText: "删除",
                variant: "destructive"
              })) {
                try {
                  onDeleteTag(String(activeTag.id));
                } catch (e) {
                  ErrorFactory.handle(e, { context: "彻底删除标签" });
                }
              }
              onClose();
            }}
          >
            <Icon name="trash-2" size={18} strokeWidth={2.5} /> 彻底删除 / Delete
          </button>
        </div>
        <button
          type="button"
          className="w-full text-slate-400 text-[10px] font-black uppercase tracking-tighter pt-2 active:text-slate-600 cursor-pointer"
          onClick={onClose}
        >
          取消操作 / CANCEL
        </button>
      </div>
    </NativeDialog>
  );
};
