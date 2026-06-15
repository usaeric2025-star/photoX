import React, { useState } from "react";
import { getSafeText } from "@/services/ai/safeText";
import { CollapsibleDescription } from "./CollapsibleDescription";
import { ProductGroup } from "@/types";
import { Quote } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { translations } from "@/locales";

interface GroupInfoPanelProps {
  groupData?: ProductGroup | null;
  lang: string;
}

export function GroupInfoPanel({ groupData, lang: globalLang }: GroupInfoPanelProps) {
  const [activeLang, setActiveLang] = useState(globalLang);
  
  if (!groupData) return null;

  // Description Logic
  const content = (() => {
    return {
       description: groupData.description || '',
    };
  })();

  if (!content.description) {
    return null;
  }

  const langLabels = {
    zh: { title: '系列故事与详情' },
    en: { title: 'Series Story & Details' },
    ms: { title: 'Kisah & Perincian Siri' }
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
                        {content.description && (
                            <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-wrap font-sans">
                                {content.description}
                            </p>
                        )}
                    </div>
                }
            />
        </div>
    </div>
  );
}
