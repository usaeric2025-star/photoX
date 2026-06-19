import { getTranslatedCategoryName } from "@/services/category/utils";
import { createTranslate } from "@/locales";
import React, { useRef } from "react";
import { translations, LanguageCode } from "@/locales";
import { Category, Manufacturer } from "@/types";
import { useLongPress } from "@/hooks/core/useLongPress";
import { MenuDialog } from "@/components/ui/MenuDialog";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useUIStore, useShallow } from "@/store/useUIStore";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function FormSectionHeader({
  title,
  subtitle,
  onAction,
  actionLabel,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-1 mb-3">
      <div className="flex flex-col">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          {title}{" "}
          {subtitle && (
            <span className="text-slate-300 ml-1">/ {subtitle}</span>
          )}
        </h3>
      </div>
      {onAction && (
        <button
          onClick={onAction}
          className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 active:bg-blue-100 transition-colors"
        >
          {actionLabel || "+ 新增"}
        </button>
      )}
    </div>
  );
}

interface ManufacturerSelectorProps {
  manufacturers: Manufacturer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit?: (mfr: Manufacturer) => void;
  onDelete?: (mfr: Manufacturer) => void;
}

export function ManufacturerList({
  manufacturers,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: ManufacturerSelectorProps) {
  const { update } = useUIStore(useShallow((s) => ({ update: s.update })));

  return (
    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto content-start px-0.5 no-scrollbar">
      {(manufacturers || []).map((mfr) => {
        const isSelected = String(selectedId || "") === String(mfr.id || "");
        return (
          <ManufacturerButton
            key={mfr.id}
            mfr={mfr}
            isSelected={isSelected}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}

interface ManufacturerButtonProps {
  mfr: Manufacturer;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onEdit?: (mfr: Manufacturer) => void;
  onDelete?: (mfr: Manufacturer) => void;
}

const ManufacturerButton = ({ mfr, isSelected, onSelect, onEdit, onDelete }: ManufacturerButtonProps) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, menuDialog] = useDisclosure(false);

  useLongPress(btnRef, {
    delay: 600,
    onLongPress: () => {
      if (onEdit || onDelete) {
        menuDialog.open();
      }
    }
  });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => onSelect(isSelected ? null : String(mfr.id))}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isSelected ? "bg-slate-800 text-white border-slate-800 shadow-lg" : "bg-white border-slate-200 text-slate-600 active:bg-slate-50"}`}
      >
        {(mfr.name || "").toUpperCase()}
      </button>
      <MenuDialog
        open={isMenuOpen}
        onOpenChange={menuDialog.toggle}
        title={`管理厂商: ${mfr.name}`}
        description="请选择操作"
        primaryActionLabel="删除"
        primaryActionVariant="destructive"
        onPrimaryAction={() => onDelete?.(mfr)}
        secondaryActionLabel="编辑"
        onSecondaryAction={() => onEdit?.(mfr)}
      />
    </>
  );
};


