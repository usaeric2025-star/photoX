import React, { useMemo } from 'react';
import { useFilters, useCategoryList, useTagList } from '@/hooks';
import { useGalleryStore } from '@/store/galleryStore';

export const FilterPanel: React.FC = () => {
    const { filters, setFilters } = useFilters();
    const { data: categories = [] } = useCategoryList();
    const { data: tags = [] } = useTagList();
    const appLang = useGalleryStore(s => s.appLang);

    const categoryList = useMemo(() => [
        { id: null, name: '全部' },
        ...categories.map(c => ({
            ...c,
            name: c[appLang as keyof Category] as string || c.name
        }))
    ], [categories, appLang]);

    // Tags (pinned first + sorted by hot score)
    const sortedTags = useMemo(() => {
        console.log('🧪 [FilterPanel] Raw Tags:', tags);
        const pinned = tags.filter(t => t.is_pinned);
        const others = tags.filter(t => !t.is_pinned).sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0));
        console.log('🧪 [FilterPanel] Pinned:', pinned);
        console.log('🧪 [FilterPanel] Others:', others);
        return [...pinned, ...others];
    }, [tags]);

    return (
        <div className="flex flex-col gap-4 p-4 border-t border-slate-100 bg-slate-50/50">
            {/* Categories Grid (2x4) */}
            <div className="grid grid-cols-4 gap-2">
                {categoryList.map(cat => (
                    <button
                        key={cat.id || 'all'}
                        onClick={() => setFilters({ ...filters, categoryId: cat.id })}
                        className={`text-xs px-2 py-2 rounded-md border text-center truncate ${filters.categoryId === cat.id ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        title={cat.name}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Tags Scrollable Area */}
            <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 p-1 bg-white rounded-md border border-slate-100">
                {sortedTags.map(tag => (
                   <button
                       key={tag.id}
                       onClick={() => {
                           const isSelected = filters.tagIds?.includes(tag.id);
                           const nextTags = isSelected
                               ? filters.tagIds?.filter(id => id !== tag.id)
                               : [...(filters.tagIds || []), tag.id];
                           setFilters({ ...filters, tagIds: nextTags });
                       }}
                       className={`text-[10px] px-2 py-0.5 rounded-full border ${filters.tagIds?.includes(tag.id) ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500'} ${tag.is_pinned ? 'border-amber-300 font-bold' : ''}`}
                   >
                       {tag.name}
                   </button>
                ))}
            </div>
        </div>
    );
};
