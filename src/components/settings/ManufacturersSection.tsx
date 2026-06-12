import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React from "react";
import { Plus } from "lucide-react";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { Manufacturer } from "../../types";
import { ManufacturerItem } from "../admin/ManufacturerItem";
import { PromptDialog } from "@/components/ui/PromptDialog";

import { toast } from 'sonner';
import { normalizeManufacturerName } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { translations } from "@/lib/translations";

interface ManufacturersSectionProps {
  manufacturers: Manufacturer[];
  addManufacturer: (name: string) => Promise<Manufacturer>;
  updateManufacturer: (
    id: string,
    data: Partial<Manufacturer>,
  ) => Promise<boolean>;
  deleteManufacturer: (id: string) => void;
  cardClass: string;
  buttonStyles: { [key in "primary" | "secondary" | "accent"]: string };
}

export function ManufacturersSection({
  manufacturers,
  addManufacturer,
  updateManufacturer,
  deleteManufacturer,
  cardClass,
  buttonStyles,
}: ManufacturersSectionProps) {
  
  const [isAddOpen, addDialog] = useDisclosure(false);
  const appLang = useUIStore(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  return (
    <section className={cardClass} id="section-manufacturers">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-navy rounded-full"></div>
          {appLang === 'zh' ? '生产商设定' : 'Manufacturers Setting'}
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">
          {(manufacturers || []).length} Items
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={addDialog.open} className={buttonStyles.accent}>
          <Plus size={16} /> {appLang === 'zh' ? '新增生产商' : 'Add New'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {(manufacturers || []).map((sub) => (
          <ManufacturerItem
            key={sub.id}
            manufacturer={sub}
            onUpdate={async (mfr) => {
              try {
                await updateManufacturer(String(mfr.id), { name: mfr.name });
              } catch (e) {
                // Handled in mutation
              }
            }}
            onDelete={(id) => deleteManufacturer(String(id))}
          />
        ))}
      </div>

      <PromptDialog
        open={isAddOpen}
        onOpenChange={addDialog.toggle}
        title={t.newMfrTitle}
        description={t.mfrNamePlaceholder}
        onConfirm={async (name: string) => {
          if (!name.trim()) return;
          const normalized = normalizeManufacturerName(name);
          if (normalized) {
            await addManufacturer(normalized);
          }
        }}
      />
    </section>
  );
}
