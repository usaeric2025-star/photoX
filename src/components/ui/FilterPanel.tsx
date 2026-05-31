import React, { useMemo, useState } from 'react';
import { useFilters, useCategoryList, useTagList } from '@/hooks';
import { useGalleryStore } from '@/store/galleryStore';
import { cn } from '@/lib/utils';
import { Category } from '@/types';

export const FilterPanel: React.FC = () => {
    const { filters, setFilters } = useFilters();
    const { data: categories = [] } = useCategoryList();
    const { data: tags = [] } = useTagList();
    const appLang = useGalleryStore(s => s.appLang);
    const [isExpanded, setIsExpanded] = useState(false);

    const categoryList = useMemo(() => [
        { id: null, name: appLang === 'en' ? 'All' : '全部' },
        ...categories.map(c => ({
            ...c,
            name: (c[appLang as keyof Category] as string) || c.name
        }))
    ], [categories, appLang]);

    // Tags (pinned first + sorted by hot score)
    const sortedTags = useMemo(() => {
        const pinned = tags.filter(t => t.is_pinned);
        const others = tags.filter(t => !t.is_pinned).sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
        return [...pinned, ...others];
    }, [tags]);

    const visibleTags = isExpanded ? sortedTags : sortedTags.slice(0, 5);
    const hiddenCount = sortedTags.length - 5;

    return (
        <div className="flex flex-col border-t border-slate-100 bg-white">
            {/* Minimalist Premium horizontal carousel for categories */}
            <div className="px-4 pt-3 pb-1 border-b border-slate-50">
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {categoryList.map(cat => (
                        <button
                            key={cat.id || 'all'}
                            onClick={() => setFilters({ ...filters, categoryId: cat.id })}
                            className={cn(
                                "text-[12px] font-semibold h-8 px-4 rounded-full transition-all duration-200 flex items-center justify-center shrink-0 whitespace-nowrap cursor-pointer",
                                filters.categoryId === cat.id 
                                    ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/10' 
                                    : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]'
                            )}
                            title={cat.name}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Integrated Tags Section matching strict PhotoX specifications */}
            <div className="mt-4 mb-6 px-4">
                <h3 className="text-[12px] font-semibold text-[#1F2937] mb-3 uppercase tracking-wider">推荐标签</h3>
                <div className="flex flex-wrap gap-x-2 gap-y-2">
                    {visibleTags.map((tag) => (
                       <button
                           key={tag.id}
                           onClick={() => {
                               const isSelected = filters.tagIds?.includes(tag.id);
                               const nextTags = isSelected
                                   ? filters.tagIds?.filter(id => id !== tag.id)
                                   : [...(filters.tagIds || []), tag.id];
                               setFilters({ ...filters, tagIds: nextTags });
                           }}
                           className={cn(
                               "h-8 text-[12px] px-3 py-1.5 rounded-[16px] transition-all duration-200 flex items-center gap-1 shrink-0 cursor-pointer",
                               // Selected state
                               filters.tagIds?.includes(tag.id) ? 'bg-[#2563EB] text-white font-semibold' : '',
                               // Pinned or Hot behaving as primary accent
                               !filters.tagIds?.includes(tag.id) && (tag.is_pinned || sortedTags.indexOf(tag) < 5) ? 'bg-[#2563EB] text-white font-medium' : '',
                               // Other normal tags
                               !filters.tagIds?.includes(tag.id) && !(tag.is_pinned || sortedTags.indexOf(tag) < 5) ? 'bg-[#E5E7EB] text-[#6B7280]' : ''
                           )}
                       >
                           {tag.name}
                       </button>
                    ))}
                    {sortedTags.length > 5 && (
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-8 text-[12px] px-3 py-1.5 rounded-[16px] bg-[#E5E7EB] text-[#6B7280] hover:bg-slate-200 transition-all shrink-0 cursor-pointer"
                        >
                            {isExpanded ? '收起' : `+${hiddenCount} 更多`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
