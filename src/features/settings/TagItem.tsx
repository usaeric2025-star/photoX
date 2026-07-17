import React from "react";
import { Icon } from '#src/components/ui/Icon.js';
import { Tag } from '#src/types/index.js';
import { useClickOutside, useLongPress } from '#src/hooks/core/index.js';
import { motion, AnimatePresence } from "lite-sleek";

interface TagItemProps {
  tag: Tag;
  activeTagMenuId: number | null;
  setActiveTagMenuId: (id: number | null) => void;
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
  activeTagMenuId,
  setActiveTagMenuId,
  handleUpdateTagName,
  deleteTag,
  isPinned,
  togglePin,
}: TagItemProps) {
  const itemRef = useClickOutside<HTMLDivElement>(() => {
    if (activeTagMenuId === tag.id) setActiveTagMenuId(null);
  });

  const longPress = useLongPress<HTMLDivElement>({
    delay: 400,
    onLongPress: () => {
      setActiveTagMenuId(tag.id);
    }
  });

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTag(tag.id);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin(tag.id);
    setActiveTagMenuId(null);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleUpdateTagName(tag);
    setActiveTagMenuId(null);
  };

  return (
    <div
      id={`tag-item-${tag.id}`}
      ref={longPress.ref}
      onMouseDown={longPress.onMouseDown}
      onMouseMove={longPress.onMouseMove}
      onMouseUp={longPress.onMouseUp}
      onMouseLeave={longPress.onMouseLeave}
      onTouchStart={longPress.onTouchStart}
      onTouchMove={longPress.onTouchMove}
      onTouchEnd={longPress.onTouchEnd}
      onTouchCancel={longPress.onTouchCancel}
      className={`bg-white border border-brand-navy/10 pl-4 pr-2 py-1.5 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative ${activeTagMenuId === tag.id ? "bg-brand-gold/10 border-brand-gold/30 scale-95" : ""}`}
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

      <AnimatePresence>
        {activeTagMenuId === tag.id && (
          <motion.div
            ref={itemRef}
            variant="scale"
            transition="easeOut"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-brand-navy rounded-xl shadow-xl p-1 flex flex-col gap-0.5 min-w-[120px] z-50"
          >
            <button
              id={`toggle-pin-tag-${tag.id}`}
              onClick={handleTogglePin}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Icon name="heart" size={12} className={isPinned ? "fill-white" : ""} />
              {isPinned ? "取消推荐" : "设为推荐"}
            </button>
            <button
              id={`edit-tag-btn-${tag.id}`}
              onClick={handleEditClick}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Icon name="pencil" size={12} /> 编辑 / EDIT
            </button>
            <button
              id={`menu-delete-tag-${tag.id}`}
              onClick={handleDeleteClick}
              className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Icon name="trash-2" size={12} /> 删除
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-navy rotate-45 -mt-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
