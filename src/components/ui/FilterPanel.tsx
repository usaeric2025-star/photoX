import React from 'react';
import { RefreshCw, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories, useTags, usePhotoFilter, useSettings, useAdminMode, useFilters } from '@/hooks';
import { useAppLang } from '@/store/useUIStore';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { cn } from '@/lib/utils';
import { Category } from '@/types';
import { translations } from '@/locales';
import { getSafeText } from '@/services/ai/safeText';
import { queryKeys } from '@/lib/query/keys';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { getPhotos as loadAllPhotosFromCloud } from '@/services/photo/queries/list';
import { PHOTO_QUERY_CONFIG } from '@/constants/config';
import { logger } from '@/lib/logger';

export function FilterPanel() {
    const filters = useFilters({ enableStatus: true });
    const { category, setCategory, tags: selectedTags, setTags } = filters;
    const { data: categories = [] } = useCategories();
    const { data: tags = [] } = useTags();
    const { settings } = useSettings();
    const [appLang] = useAppLang();
    const [isExpanded, { toggle: toggleExpanded }] = useDisclosure(false);
    const queryClient = useQueryClient();
    const isAdminMode = filters.isAdminMode;

    const prefetchCategoryPhotos = (categoryId: string | null) => {
        // Only prefetch if we aren't already looking at it
        if (category === (categoryId || '')) return;

        queryClient.prefetchInfiniteQuery({
            queryKey: queryKeys.photos.infinite({ 
              category: filters.category || undefined,
              tags: selectedTags && selectedTags.length > 0 ? selectedTags : undefined,
              q: filters.search || undefined,
              sort: filters.sort || undefined,
            }, isAdminMode ? 'admin' : 'public'),
            queryFn: async ({ pageParam = 1 }: any) => {
              const { getPhotos } = await import('@/services/photo/queries/list');
              const photos = await getPhotos(
                undefined,
                (pageParam as number) - 1,
                PHOTO_QUERY_CONFIG.limit,
                categoryId,
                selectedTags && selectedTags.length > 0 ? selectedTags[0] : null,
                filters.search,
                isAdminMode,
                undefined,
                filters.sort
              );
              return { photos, nextPage: photos.length >= PHOTO_QUERY_CONFIG.limit ? (pageParam as number) + 1 : undefined };
            },
            initialPageParam: 1,
            staleTime: 2 * 60 * 1000,
        } as any);
    };

    const t = (translations as any)[appLang] || translations.en;

    const categoryList = [
        { id: null, name: t.all },
        ...categories.map(c => ({
            ...c,
            name: getSafeText(c, appLang)
        }))
    ];

    // Unified Tags Logic using usePhotoFilter
    const { tagsToRender, pinnedIds, hotIds } = usePhotoFilter(tags, settings);

    const visibleTags = isExpanded ? tagsToRender : tagsToRender.slice(0, 10);
    const hiddenCount = tagsToRender.length - (isExpanded ? 0 : 10);

    return (
        <div className="flex flex-col border-t border-slate-100 bg-white relative">
            {/* Minimalist Premium categories section: 2 rows of 4 items structured grid */}
            <div className="border-b border-slate-50/50 bg-white">
                <div className="grid grid-cols-4 gap-2 overflow-x-auto md:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4 py-3 whitespace-nowrap scroll-smooth">
                    {categoryList.slice(0, 8).map(cat => (
                        <button
                            key={cat.id || 'all'}
                            onClick={() => {                
                                setCategory(cat.id || '');
                            }}
                            onMouseEnter={() => prefetchCategoryPhotos(cat.id)}
                            className={cn(
                                "text-[11px] font-black h-8 px-4 rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer pointer-events-auto active:scale-95 shrink-0 select-none shadow-sm capitalize border",
                                category === (cat.id || '')
                                    ? 'bg-brand-navy border-brand-navy text-white shadow-md shadow-brand-navy/20' 
                                    : 'bg-slate-50 border-slate-100 text-[#374151] hover:bg-slate-100 hover:border-slate-200'
                            )}
                            title={cat.name || t.all}
                        >
                            {(cat.name || t.all || 'Unnamed')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Integrated Tags Section matching strict PhotoX specifications */}
            <div className="py-0.5 px-4 border-b border-slate-100/30 bg-white shadow-inner shadow-slate-50">
                <div className="flex items-center justify-between mb-1 px-0.5">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.05em]">
                        {t.hotTags}
                    </span>
                    {tagsToRender.length > 10 && (
                        <button 
                            onClick={() => toggleExpanded()}
                            className="text-[9px] p-0.5 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-200 transition-all cursor-pointer pointer-events-auto"
                            title={isExpanded ? t.collapse : t.more(hiddenCount)}
                        >
                            {isExpanded ? <ChevronUp size={10} /> : <MoreHorizontal size={10} />}
                        </button>
                    )}
                </div>
                
                <div className={cn(
                    "transition-all duration-300",
                    isExpanded 
                        ? "flex flex-wrap gap-1.5 items-center pb-2" 
                        : "flex flex-wrap gap-1.5 items-center pb-1.5 max-h-[52px] overflow-hidden"
                )}>
                    {visibleTags.map((tag) => {
                        const isPinned = pinnedIds.includes(String(tag.id));
                        const isHot = hotIds.has(String(tag.id));
                        const isSelected = selectedTags.includes(String(tag.id));

                        return (
                           <button
                               key={tag.id}
                               onClick={() => {
                                   if (isSelected) {
                                       setTags(selectedTags.filter((id: string) => id !== String(tag.id)));
                                   } else {
                                       setTags([String(tag.id)]);
                                   }
                               }}
                               className={cn(
                                   "h-5 text-[9.5px] px-2 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer pointer-events-auto border shrink-0",
                                   // Selected state
                                   isSelected 
                                       ? 'bg-brand-navy border-brand-navy text-white font-bold shadow-sm' 
                                       : 'bg-slate-50 text-[#374151] border-slate-200/60 hover:border-slate-300 hover:bg-slate-100',
                                   // Accent for pinned/hot tags when not selected
                                   !isSelected && (isPinned || isHot) 
                                        ? 'bg-amber-50 text-brand-gold border-brand-gold/30 font-semibold'
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
