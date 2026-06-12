import React from "react";
import { Sparkles, X, Plus } from "lucide-react";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { PromptDialog } from "@/components/ui/PromptDialog";
import { ProductGroup } from "../../../../types";

interface SeriesDNASectionProps {
  groupData: ProductGroup | null;
  handleUpdateGroupData: (updates: Partial<ProductGroup>) => Promise<void>;
}

export function SeriesDNASection({
  groupData,
  handleUpdateGroupData,
}: SeriesDNASectionProps) {
  const [isAddColorOpen, addColorDialog] = useDisclosure(false);
  const [isAddMaterialOpen, addMaterialDialog] = useDisclosure(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-indigo-500" />
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
          系列DNA / DNA Elements
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Colors */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3">
            系列配色库 (Colors)
          </label>
          <div className="flex flex-wrap gap-2">
            {(groupData?.colors || []).map((color: string, idx: number) => (
              <div key={idx} className="group relative">
                <div
                  className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <button
                  onClick={() =>
                    handleUpdateGroupData({
                      colors: (groupData?.colors || []).filter((_, i) => i !== idx),
                    })
                  }
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
            <button
              onClick={addColorDialog.open}
              className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:text-indigo-400"
            >
              <Plus size={16} />
            </button>
            <PromptDialog
              open={isAddColorOpen}
              onOpenChange={addColorDialog.toggle}
              title="Add Color"
              description="Enter Color Hex Code (#FF0000):"
              onConfirm={(c: string) => {
                if (c && c.trim())
                  handleUpdateGroupData({
                    colors: [...(groupData?.colors || []), c.trim()]
                  });
              }}
            />
          </div>
        </div>

        {/* Materials */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3">
            系列材质库 (Materials)
          </label>
          <div className="flex flex-wrap gap-2">
            {(groupData?.materials || []).map((material: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-150 rounded-lg text-xs font-black text-slate-700 shadow-sm group"
              >
                <span>{material}</span>
                <button
                  onClick={() =>
                    handleUpdateGroupData({
                      materials: (groupData?.materials || []).filter((_, i) => i !== idx),
                    })
                  }
                  className="text-slate-400 hover:text-red-500 transition-colors ml-1 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={addMaterialDialog.open}
              className="px-3 py-1 rounded-lg border border-dashed border-slate-200 bg-white flex items-center justify-center gap-1 text-slate-400 hover:text-indigo-600 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus size={12} />
              <span>添加材质</span>
            </button>
            <PromptDialog
              open={isAddMaterialOpen}
              onOpenChange={addMaterialDialog.toggle}
              title="添加材质 / Add Material"
              description="请输入新材质名称:"
              placeholder="如: 黄铜, 皮革, 实木, Leather..."
              onConfirm={(m: string) => {
                if (m && m.trim())
                  handleUpdateGroupData({
                    materials: [...(groupData?.materials || []), m.trim()]
                  });
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
