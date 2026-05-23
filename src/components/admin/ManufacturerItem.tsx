import React, { useState, useRef } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGalleryStore } from '../../store';
import { useClickOutside, useLongPress } from '../../hooks';
import { normalizeManufacturerName } from '../../utils/stringHelper';

import { Manufacturer } from '../../types';

interface ManufacturerProps {
  manufacturer: Manufacturer;
  onUpdate: (mfr: Manufacturer) => void;
  onDelete: (id: string | number) => void;
}

export const ManufacturerItem = ({ manufacturer, onUpdate, onDelete }: ManufacturerProps) => {
  const { setAlertDialog } = useGalleryStore();
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);

  const menuRef = useClickOutside<HTMLDivElement>(
    activeMenuId === manufacturer.id,
    () => setActiveMenuId(null)
  );

  const longPressProps = useLongPress(
    () => {
      setActiveMenuId(manufacturer.id);
    },
    undefined,
    { delay: 500, shouldPreventDefault: true }
  );

  return (
    <div 
      ref={menuRef}
      className={`bg-white border border-brand-navy/10 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative ${activeMenuId === manufacturer.id ? 'bg-brand-gold/10 border-brand-gold/30 scale-95' : ''}`}
      {...longPressProps}
    >
      <div className="flex flex-col">
        <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight select-none">
          {manufacturer.zh || manufacturer.name}
        </span>
        {manufacturer.en && (
          <span className="text-[8px] font-bold text-brand-navy/30 uppercase tracking-tighter select-none">
            {manufacturer.en}
          </span>
        )}
      </div>

      <AnimatePresence>
        {activeMenuId === manufacturer.id && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-brand-navy rounded-xl shadow-xl p-1 flex flex-col gap-0.5 z-[101] min-w-[120px]"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                useGalleryStore.getState().setPromptDialog({
                  title: '编辑名称 (EN) / Edit (EN)',
                  message: '输入新的英文名称 / Enter new English name:',
                  placeholder: manufacturer.en || '',
                  onSubmit: (name) => name !== undefined && onUpdate({ ...manufacturer, en: normalizeManufacturerName(name) })
                });
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Pencil size={12} /> 编辑 (EN)
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                useGalleryStore.getState().setPromptDialog({
                  title: '编辑名称 (ZH) / Edit (ZH)',
                  message: '输入新的中文名称 / Enter new Chinese name:',
                  placeholder: manufacturer.zh || manufacturer.name,
                  onSubmit: (name) => name && onUpdate({ ...manufacturer, zh: normalizeManufacturerName(name), name: normalizeManufacturerName(name) })
                });
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Pencil size={12} /> 编辑 (ZH)
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setAlertDialog({
                  title: '确认删除',
                  message: `确定要删除「${manufacturer.name}」吗？此操作不可恢复。`,
                  confirmLabel: '删除',
                  cancelLabel: '取消',
                  type: 'danger',
                  onConfirm: () => onDelete(manufacturer.id)
                });
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Trash2 size={12} /> 删除
            </button>
            <div 
              className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-navy rotate-45 -mt-1"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
