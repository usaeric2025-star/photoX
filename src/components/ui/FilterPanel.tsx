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
            {/* Minimalist Premium grid for categories (2 rows, 4 columns) */}
            <div className="px-4 pt-3 pb-3 border-b border-slate-50">
                <div className="grid grid-cols-4 gap-1.5">
                    {categoryList.slice(0, 8).map(cat => (
                        <button
                            key={cat.id || 'all'}
                            onClick={() => setFilters({ ...filters, categoryId: cat.id })}
                            className={cn(
                                "text-[10px] font-semibold h-7 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer",
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
            <div className="mt-2 mb-4 px-4">
                <div className="flex items-center justify-end mb-2">
                    {sortedTags.length > 5 && isExpanded && (
                         <button 
                             onClick={() => setIsExpanded(false)}
                             className="text-[10px] px-2 py-0.5 rounded bg-[#E5E7EB] text-[#6B7280] hover:bg-slate-200 transition-all cursor-pointer"
                         >
                             收起
                         </button>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-x-1 gap-y-1">
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
                               "h-6 text-[10px] px-2 py-0.5 rounded-full transition-all duration-200 flex items-center gap-0.5 shrink-0 cursor-pointer",
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
                    {sortedTags.length > 5 && !isExpanded && (
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="h-6 text-[10px] px-2 py-0.5 rounded-full bg-[#E5E7EB] text-[#6B7280] hover:bg-slate-200 transition-all shrink-0 cursor-pointer"
                        >
                            {`+${hiddenCount} 更多`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
