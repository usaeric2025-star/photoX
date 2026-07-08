import React, { useState, useRef } from "react";
import { Icon } from '#src/components/ui/Icon.js';
import { useDisclosure, useTranslation } from '#src/hooks/index.js';
import { useClickOutside } from '#src/hooks/core/index.js';
import { PromptDialog } from "#src/components/ui/PromptDialog.js";
import { useLongPress } from "#src/hooks/core/index.js";
import { normalizeManufacturerName } from "#lib/utils.js";
import { useConfirm } from '#src/context/ConfirmContext.js';

import { Manufacturer } from '#src/types/index.js';

interface ManufacturerProps {
  manufacturer: Manufacturer;
  onUpdate: (mfr: Manufacturer) => void;
  onDelete: (id: string | number) => void;
}

import { NativePopover } from "#src/components/ui/NativePopover.js";

export const ManufacturerItem = ({
  manufacturer,
  onUpdate,
  onDelete,
}: ManufacturerProps) => {
  const { t } = useTranslation();
  const [isEditOpen, editDialog] = useDisclosure(false);
  const confirm = useConfirm();

  return (
    <div
      className="bg-white border border-brand-navy/10 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative"
    >
      <div className="flex flex-col">
        <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight select-none">
          {manufacturer.name}
        </span>
      </div>

      <NativePopover
        align="center"
        trigger={
          <div className="p-1 cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
             {/* Small indicator or just trigger on name? User used long press or button? 
                 In original it was absolute positioned over the whole thing based on activeMenuId.
                 Let's add a small dots icon as a trigger for better UX.
              */}
             <Icon name="more-vertical" size={14} />
          </div>
        }
      >
        <div className="flex flex-col gap-0.5 p-1 min-w-[120px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              editDialog.open();
            }}
            className="px-3 py-2 text-slate-700 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Icon name="pencil" size={12} /> {t('edit')}
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (await confirm({
                title: t('confirmDeleteTitleBatch'),
                description: t('confirmDeleteMfrDesc', manufacturer.name),
                confirmText: t('delete'),
                variant: "destructive"
              })) {
                onDelete(manufacturer.id);
              }
            }}
            className="px-3 py-2 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Icon name="trash-2" size={12} /> {t('delete')}
          </button>
        </div>
      </NativePopover>

      <PromptDialog
        open={isEditOpen}
        onOpenChange={editDialog.toggle}
        title={t('editMfrTitle')}
        description={t('enterNewName')}
        defaultValue={manufacturer.name}
        placeholder={manufacturer.name}
        onConfirm={(name) => {
          if (name) {
            const normalized = normalizeManufacturerName(name);
            onUpdate({ ...manufacturer, name: normalized });
          }
        }}
      />
    </div>
  );
};
