import React, { useState } from "react";
import { getSafeText } from "@/lib/ai/safeText";
import { CollapsibleDescription } from "./CollapsibleDescription";
import { ProductGroup } from "@/types";
import { Quote } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { translations } from "@/lib/translations";

interface GroupInfoPanelProps {
  groupData?: ProductGroup | null;
  lang: string;
}

export function GroupInfoPanel({ groupData, lang: globalLang }: GroupInfoPanelProps) {
  const [activeLang, setActiveLang] = useState(globalLang);
  
  if (!groupData) return null;

  // Description and Content Logic
  const content = React.useMemo(() => {
    const desc = getSafeText(groupData.description, activeLang as any) || getSafeText(groupData.description, 'zh');
    return {
       description: desc,
       materials: groupData.materials || [],
       colors: groupData.colors || []
    };
  }, [groupData, activeLang]);

  if (!content.description && content.materials.length === 0 && content.colors.length === 0) {
    return null;
  }

  const langLabels = {
    zh: { title: '系列故事与详情', materials: '材质', colors: '配色' },
    en: { title: 'Series Story & Details', materials: 'Materials', colors: 'Colors' },
    ms: { title: 'Kisah & Perincian Siri', materials: 'Bahan/Kit', colors: 'Warna' }
  };

  const labels = langLabels[activeLang as keyof typeof langLabels] || langLabels.en;

  return (
    <div className="px-4 sm:px-6 pt-2 pb-4 w-full max-w-4xl mx-auto">
        <div className={`rounded-[2rem] border transition-all duration-300 overflow-hidden ${
        groupData.is_hidden 
          ? 'bg-slate-50/80 border-slate-200/60' 
          : 'bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]'
        }`}>
            <CollapsibleDescription 
                title={labels.title}
                description={
                    <div className="space-y-5">
                        {/* Language Selector */}
                        <div className="flex items-center gap-1 p-1 bg-slate-50 w-fit rounded-xl border border-slate-100/50">
                           {['zh', 'en', 'ms'].map((l) => (
                             <button
                                key={l}
                                onClick={(e) => { e.stopPropagation(); setActiveLang(l); }}
                                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                                  activeLang === l 
                                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-100' 
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                             >
                               {l}
                             </button>
                           ))}
                        </div>

                        {content.description && (
                            <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-wrap font-sans">
                                {content.description}
                            </p>
                        )}
                        
                        {content.materials.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1 items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">
                                  {labels.materials}
                                </span>
                                {content.materials.map(m => (
                                <div key={m} className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                                    <span className="text-[11px] font-semibold text-slate-600">{m}</span>
                                </div>
                                ))}
                            </div>
                        )}

                        {content.colors.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                                    {labels.colors}
                                </span>
                                <div className="flex flex-wrap gap-2.5 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                    {content.colors.map((c, i) => (
                                        <div 
                                        key={i} 
                                        className="w-10 h-10 rounded-xl border border-white shadow-sm ring-1 ring-slate-200/50 transition-all hover:scale-105 hover:shadow-md"
                                        style={{ backgroundColor: c }}
                                        title={c}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                }
            />
        </div>
    </div>
  );
}
