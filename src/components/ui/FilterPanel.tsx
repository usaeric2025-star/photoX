import React, { useMemo, useState } from 'react';
import { RefreshCw, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { useFilters, useCategories, useTags, useTagsDisplay, useSettings } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { Category } from '@/types';
import { translations } from '@/lib/translations';

export function FilterPanel() {
    const { filters, setCategory, setTags } = useFilters();
    const { data: categories = [] } = useCategories();
    const { data: tags = [] } = useTags();
    const { settings } = useSettings();
    const appLang = useUIStore(s => s.appLang);
    const [isExpanded, setIsExpanded] = useState(false);

    const t = (translations as any)[appLang];

    const categoryList = useMemo(() => [
        { id: null, name: t.all },
        ...categories.map(c => ({
            ...c,
            name: (c[appLang as keyof Category] as string) || c.name
        }))
    ], [categories, appLang, t.all]);

    // Unified Tags Logic using useTagsDisplay
    const { tagsToRender, pinnedIds, hotIds } = useTagsDisplay(tags, settings);

    const visibleTags = isExpanded ? tagsToRender : tagsToRender.slice(0, 15);
    const hiddenCount = tagsToRender.length - 15;

    return (
        <div className="flex flex-col border-t border-slate-100 bg-white relative z-50">
            {/* Minimalist Premium grid for categories (2 rows, 4 columns) */}
            <div className="px-4 pt-3 pb-3 border-b border-slate-50">
                <div className="grid grid-cols-4 gap-1.5">
                    {categoryList.slice(0, 8).map(cat => (
                        <button
                            key={cat.id || 'all'}
                            onClick={() => setCategory(cat.id)}
                            className={cn(
                                "text-[10px] font-bold h-7 px-3 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer pointer-events-auto",
                                filters.categoryId === cat.id 
                                    ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/10' 
                                    : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]'
                            )}
                            title={cat.name}
                        >
                            {(cat.name || '').toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Integrated Tags Section matching strict PhotoX specifications */}
            <div className="mt-1 mb-1.5 px-4">
                <div className="flex items-center justify-between mb-1 px-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.05em]">
                        {t.hotTags}
                    </span>
                    {tagsToRender.length > 15 && (
                         <button 
                             onClick={() => setIsExpanded(!isExpanded)}
                             className="text-[10px] p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all cursor-pointer pointer-events-auto"
                             title={isExpanded ? t.collapse : t.more(hiddenCount)}
                         >
                             {isExpanded ? <ChevronUp size={14} /> : <MoreHorizontal size={14} />}
                         </button>
                    )}
                </div>
                
                <div className={cn(
                    "flex flex-wrap gap-x-1 gap-y-1 items-center",
                    !isExpanded && "max-h-[52px] overflow-hidden content-start"
                )}>
                    {visibleTags.map((tag) => {
                        const isPinned = pinnedIds.includes(String(tag.id));
                        const isHot = hotIds.has(String(tag.id));
                        const isSelected = filters.tagIds?.includes(tag.id);

                        return (
                           <button
                               key={tag.id}
                               onClick={() => {
                                   const nextTags = isSelected
                                       ? filters.tagIds?.filter(id => id !== tag.id)
                                       : [...(filters.tagIds || []), tag.id];
                                   setTags(nextTags);
                               }}
                               className={cn(
                                   "h-6 text-[10.5px] px-3 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer pointer-events-auto border",
                                   // Selected state
                                   isSelected 
                                       ? 'bg-[#2563EB] text-white font-semibold border-transparent' 
                                       : 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB] hover:border-slate-300',
                                   // Accent for pinned/hot tags when not selected
                                   !isSelected && (isPinned || isHot) 
                                       ? 'bg-slate-800 text-white border-transparent' 
                                       : ''
                               )}
                           >
                               {tag.name}
                           </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
