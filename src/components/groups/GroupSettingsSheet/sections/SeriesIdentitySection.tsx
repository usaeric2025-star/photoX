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
  const handleNameChange = (lang: 'zh' | 'en' | 'ms', val: string) => {
    setGroupData((prev) =>
      prev ? { ...prev, name: { ...prev.name, [lang]: val } } : null
    );
  };

  const handleDescriptionChange = (lang: 'zh' | 'en' | 'ms', val: string) => {
    setGroupData((prev) =>
      prev ? { ...prev, description: { ...prev.description, [lang]: val } } : null
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Names */}
          {(['zh', 'en', 'ms'] as const).map((lang) => (
            <div key={`name-${lang}`} className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                {lang === 'zh' ? '系列正式名称 (中文 / ZH)' : lang === 'en' ? 'Series Name (English / EN)' : 'Nama Siri (Malay / MS)'}
              </label>
              <input
                value={groupData?.name?.[lang] || ""}
                onChange={(e) => handleNameChange(lang, e.target.value)}
                onBlur={(e) => {
                  if (groupData) handleUpdateGroupData({ name: { ...groupData.name, [lang]: e.target.value } });
                }}
                className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-base sm:text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Descriptions */}
          {(['zh', 'en', 'ms'] as const).map((lang) => (
            <div key={`desc-${lang}`} className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                {lang === 'zh' ? '系列故事 (中文 / ZH)' : lang === 'en' ? 'Series Story (English / EN)' : 'Kisah Siri (Malay / MS)'}
              </label>
              <textarea
                value={groupData?.description?.[lang] || ""}
                onChange={(e) => handleDescriptionChange(lang, e.target.value)}
                onBlur={(e) => {
                  if (groupData) handleUpdateGroupData({ description: { ...groupData.description, [lang]: e.target.value } });
                }}
                className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-base sm:text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm h-20 resize-none"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
