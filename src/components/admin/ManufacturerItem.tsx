import React, { useState, useRef } from "react";
import { Trash2, Pencil } from "lucide-react";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useClickOutside } from '@/hooks/core/useClickOutside';
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { useLongPress } from "@/hooks/core/useLongPress";
import { normalizeManufacturerName } from "@/lib/utils";

import { Manufacturer } from "../../types";

interface ManufacturerProps {
  manufacturer: Manufacturer;
  onUpdate: (mfr: Manufacturer) => void;
  onDelete: (id: string | number) => void;
}

export const ManufacturerItem = ({
  manufacturer,
  onUpdate,
  onDelete,
}: ManufacturerProps) => {
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(
    null,
  );
  const [isEditOpen, editDialog] = useDisclosure(false);
  const [isDeleteOpen, deleteDialog] = useDisclosure(false);

  const menuRef = useClickOutside(() => {
    if (activeMenuId === manufacturer.id) setActiveMenuId(null);
  });

  useLongPress(menuRef as any, {
    delay: 400,
    onLongPress: () => {
      setActiveMenuId(manufacturer.id);
    }
  });

  return (
    <div
      ref={menuRef}
      className={`bg-white border border-brand-navy/10 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative ${activeMenuId === manufacturer.id ? "bg-brand-gold/10 border-brand-gold/30 scale-95" : ""}`}
    >
      <div className="flex flex-col">
        <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight select-none">
          {manufacturer.name}
        </span>
      </div>

      {activeMenuId === manufacturer.id && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-brand-navy rounded-xl shadow-xl p-1 flex flex-col gap-0.5 z-[var(--z-dropdown)] min-w-[120px] animate-scale-in"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                editDialog.open();
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Pencil size={12} /> 编辑名称
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteDialog.open();
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Trash2 size={12} /> 删除
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-navy rotate-45 -mt-1" />
          </div>
        )}

      <PromptDialog
        open={isEditOpen}
        onOpenChange={editDialog.toggle}
        title="编辑厂商名称 / Edit Manufacturer"
        description="输入新的名称 / Enter new name:"
        defaultValue={manufacturer.name}
        placeholder={manufacturer.name}
        onConfirm={(name) => {
          if (name) {
            const normalized = normalizeManufacturerName(name);
            onUpdate({ ...manufacturer, name: normalized });
          }
        }}
      />
      
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={deleteDialog.toggle}
        title="确认删除"
        description={`确定要删除「${manufacturer.name}」吗？此操作不可恢复。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => onDelete(manufacturer.id)}
      />
    </div>
  );
};
