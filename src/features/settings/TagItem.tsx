import React from "react";
import { Icon } from '#src/components/ui/Icon.js';
import { Tag } from '#src/types/index.js';
import { useClickOutside, useLongPress } from '#src/hooks/core/index.js';
import { motion, AnimatePresence } from "lite-sleek";

import { NativePopover } from '#src/components/ui/NativePopover.js';

interface TagItemProps {
  tag: Tag;
  handleUpdateTagName: (tag: Tag) => void;
  deleteTag: (id: number) => void;
  isPinned: boolean;
  togglePin: (id: number) => void;
}

/**
 * TagItem
 * 
 * 顯示單個標籤項目，支持長按菜單（編輯、推薦、刪除）。
 */
export function TagItem({
  tag,
  handleUpdateTagName,
  deleteTag,
  isPinned,
  togglePin,
}: TagItemProps) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTag(tag.id);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin(tag.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleUpdateTagName(tag);
  };

  return (
    <NativePopover
      align="center"
      trigger={
        <div
          id={`tag-item-${tag.id}`}
          className={`bg-white border border-brand-navy/10 pl-4 pr-2 py-1.5 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative cursor-pointer hover:bg-brand-navy/[0.02]`}
        >
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight select-none flex items-center gap-1">
              {isPinned && (
                <Icon 
                  name="heart" 
                  size={10} 
                  className="text-brand-gold fill-brand-gold shrink-0" 
                />
              )}
              {tag.name}
            </span>
          </div>

          <button
            id={`quick-delete-tag-${tag.id}`}
            onClick={handleDeleteClick}
            className="text-brand-navy/20 hover:text-brand-gold p-1 rounded-full transition-colors outline-none"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      }
    >
      <div className="bg-brand-navy rounded-xl p-1 flex flex-col gap-0.5 min-w-[120px]">
        <button
          id={`toggle-pin-tag-${tag.id}`}
          onClick={handleTogglePin}
          className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors w-full text-left"
        >
          <Icon name="heart" size={12} className={isPinned ? "fill-white" : ""} />
          {isPinned ? "取消推荐" : "设为推荐"}
        </button>
        <button
          id={`edit-tag-btn-${tag.id}`}
          onClick={handleEditClick}
          className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors w-full text-left"
        >
          <Icon name="pencil" size={12} /> 编辑 / EDIT
        </button>
        <button
          id={`menu-delete-tag-${tag.id}`}
          onClick={handleDeleteClick}
          className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors w-full text-left"
        >
          <Icon name="trash-2" size={12} /> 删除
        </button>
      </div>
    </NativePopover>
  );
}
