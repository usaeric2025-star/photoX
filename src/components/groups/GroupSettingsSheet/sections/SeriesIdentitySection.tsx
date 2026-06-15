import React from "react";
import { EyeOff, Eye } from "lucide-react";
import { ProductGroup } from "../../../../types";

interface SeriesIdentitySectionProps {
  groupData: ProductGroup | null;
  setGroupData: React.Dispatch<React.SetStateAction<ProductGroup | null>>;
  handleUpdateGroupData: (updates: Partial<ProductGroup>) => Promise<void>;
}

export function SeriesIdentitySection({
  groupData,
  setGroupData,
  handleUpdateGroupData,
}: SeriesIdentitySectionProps) {
  const handleNameChange = (val: string) => {
    setGroupData((prev) =>
      prev ? { ...prev, name: val } : null
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-1 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
            系列基本信息 / Series Identity
          </h4>
        </div>

        <button
          onClick={() =>
            handleUpdateGroupData({ is_hidden: !groupData?.is_hidden })
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${groupData?.is_hidden ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-green-50 border-green-200 text-green-600"}`}
        >
          {groupData?.is_hidden ? <EyeOff size={12} /> : <Eye size={12} />}
          <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
            {groupData?.is_hidden ? "屏蔽中" : "显示中"}
          </span>
        </button>
      </div>

      <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
              Series Name
            </label>
            <input
              value={groupData?.name || ""}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={(e) => {
                if (groupData) handleUpdateGroupData({ name: e.target.value });
              }}
              className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-base sm:text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-sm"
            />
        </div>
      </div>
    </section>
  );
}
