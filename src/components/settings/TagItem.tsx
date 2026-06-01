import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Pencil, Trash2 } from "lucide-react";
import { Tag } from "../../types";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { useClickAway } from "@/hooks/ui";
import { useLongPress } from "@shined/react-use";

interface TagItemProps {
  tag: Tag;
  activeTagMenuId: string | null;
  setActiveTagMenuId: (id: string | null) => void;
  handleUpdateTagName: (tag: Tag) => void;
  deleteTag: (id: string) => void;
  isPinned: boolean;
  togglePin: (id: string) => void;
}

export function TagItem({
  tag,
  activeTagMenuId,
  setActiveTagMenuId,
  handleUpdateTagName,
  deleteTag,
  isPinned,
  togglePin,
}: TagItemProps) {
  const { update } = useUIStore(useShallow((s) => ({ update: s.update })));

  const itemRef = useRef<HTMLDivElement>(null);
  useClickAway(itemRef, () => {
    if (activeTagMenuId === tag.id) setActiveTagMenuId(null);
  });

  const longPressBind = useLongPress(
    null,
    () => {
      setActiveTagMenuId(tag.id);
    },
    { delay: 500 }
  );

  const handleDeleteClick = () => {
    update({
      alertDialog: {
        title: "确认删除",
        message: `确定要删除「${tag.name}」吗？此操作不可恢复。`,
        confirmLabel: "删除",
        cancelLabel: "取消",
        type: "danger",
        onConfirm: () => deleteTag(tag.id),
      },
    });
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

  const handleMenuDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    update({
      alertDialog: {
        title: "确认删除",
        message: `确定要删除「${tag.name}」吗？此操作不可恢复。`,
        confirmLabel: "删除",
        cancelLabel: "取消",
        type: "danger",
        onConfirm: () => deleteTag(tag.id),
      },
    });
    setActiveTagMenuId(null);
  };

  return (
    <div
      ref={itemRef}
      className={`bg-white border border-brand-navy/10 pl-4 pr-2 py-1.5 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative ${activeTagMenuId === tag.id ? "bg-brand-gold/10 border-brand-gold/30 scale-95" : ""}`}
      {...longPressBind}
    >
      <div className="flex flex-col">
        <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight select-none flex items-center gap-1">
          {isPinned && (
            <Heart
              size={10}
              className="text-brand-gold fill-brand-gold shrink-0"
            />
          )}
          {tag.name}
        </span>
      </div>

      <button
        onClick={handleDeleteClick}
        className="text-brand-navy/20 hover:text-brand-gold p-1 rounded-full"
      >
        <X size={14} />
      </button>

      <AnimatePresence>
        {activeTagMenuId === tag.id && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-brand-navy rounded-xl shadow-xl p-1 flex flex-col gap-0.5 z-[101] min-w-[120px]"
          >
            <button
              onClick={handleTogglePin}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Heart size={12} className={isPinned ? "fill-white" : ""} />{" "}
              {isPinned ? "取消推荐" : "设为推荐"}
            </button>
            <button
              onClick={handleEditClick}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Pencil size={12} /> 编辑 / EDIT
            </button>
            <button
              onClick={handleMenuDeleteClick}
              className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Trash2 size={12} /> 删除
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-navy rotate-45 -mt-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
