import React from "react";
import { Plus } from "lucide-react";
import { Manufacturer } from "../../types";
import { ManufacturerItem } from "../admin/ManufacturerItem";
import { useUIStore } from "@/store/useUIStore";
import { useErrorHandler } from "../../hooks";
import { toast } from "@/lib/ui/toast";
import { normalizeManufacturerName } from "@/lib/utils";

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
  const update = useUIStore((s) => s.update);
  const { handleError } = useErrorHandler();

  const handleAddManufacturer = () => {
    update({
      promptDialog: {
        title: "新增生产商 / Add Manufacturer",
        message: "输入生产商名称 / Enter manufacturer name:",
        onSubmit: async (name: string) => {
          if (!name.trim()) return;
          const normalized = normalizeManufacturerName(name);
          if (normalized) {
            await addManufacturer(normalized);
          }
        },
      },
    });
  };

  const handleUpdateMfrName = async (mfr: Manufacturer) => {
    update({
      promptDialog: {
        title: "编辑生产商 / Edit Manufacturer",
        message: "输入新名称 / Enter new name:",
        placeholder: mfr.name,
        onSubmit: async (name: string) => {
          const normalized = normalizeManufacturerName(name);
          if (normalized && normalized !== mfr.name) {
            try {
              await updateManufacturer(String(mfr.id), { name: normalized });
              toast.success("厂商更新成功");
            } catch (e) {
              handleError(e, "更新厂商失败");
            }
          }
        },
      },
    });
  };

  return (
    <section className={cardClass} id="section-manufacturers">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-navy rounded-full"></div>
          生产商设定 / Manufacturers
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">
          {(manufacturers || []).length} Items
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={handleAddManufacturer} className={buttonStyles.accent}>
          <Plus size={16} /> 新增生产商 / Add New
        </button>
      </div>
      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {(manufacturers || []).map((sub) => (
          <ManufacturerItem
            key={sub.id}
            manufacturer={sub}
            onUpdate={handleUpdateMfrName}
            onDelete={(id) => deleteManufacturer(String(id))}
          />
        ))}
      </div>
    </section>
  );
}
