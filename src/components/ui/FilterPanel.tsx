import React, { useMemo } from 'react';
import { RefreshCw, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories, useTags, usePhotoFilter, useSettings, useUrlFilters, useAdminMode } from '@/hooks';
import { useAppLang } from '@/store/useUIStore';
import { useDisclosure } from '@mantine/hooks';
import { cn } from '@/lib/utils';
import { Category } from '@/types';
import { translations } from '@/lib/translations';
import { getSafeText } from '@/lib/ai/safeText';
import { categoryKeys, tagKeys, photoKeys } from '@/lib/queryKeys';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { loadAllPhotosFromCloud } from '@/services/photo';
import { PHOTO_QUERY_CONFIG } from '@/lib/photoQueryConfig';
import { logger } from '@/lib/logger';

export function FilterPanel() {
    const { filters: urlFilters, setCategory, setTagId } = useUrlFilters();
    const { data: categories = [] } = useCategories();
    const { data: tags = [] } = useTags();
    const { settings } = useSettings();
    const [appLang] = useAppLang();
    const [isExpanded, { toggle: toggleExpanded }] = useDisclosure(false);
    const queryClient = useQueryClient();
    const isAdminMode = useAdminMode();

    const prefetchCategoryPhotos = (categoryId: string | null) => {
        // Only prefetch if we aren't already looking at it
        if (urlFilters.categoryId === categoryId) return;

        queryClient.prefetchInfiniteQuery({
            queryKey: photoKeys.infinite({ 
              category_id: categoryId || null,
              tag_id: urlFilters.tagId,
              searchQuery: urlFilters.searchQuery,
              sortOrder: urlFilters.sortOrder,
              isAdminMode: isAdminMode,
              limit: PHOTO_QUERY_CONFIG.limit
            }),
            queryFn: async ({ pageParam = 1 }: any) => {
              const res = await loadAllPhotosFromCloud(
                undefined,
                (pageParam as number) - 1,
                PHOTO_QUERY_CONFIG.limit,
                categoryId,
                urlFilters.tagId,
                urlFilters.searchQuery,
                isAdminMode,
                undefined,
                urlFilters.sortOrder
              );
              if (!res.ok) throw new Error(res.message);
              const photos = res.data || [];
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

    logger.debug('[FilterPanel] Rendering. Current categoryId in URL:', urlFilters.categoryId, 'Categories count:', categoryList.length);

    // Unified Tags Logic using usePhotoFilter
    const { tagsToRender, pinnedIds, hotIds } = usePhotoFilter(tags, settings);

    const visibleTags = isExpanded ? tagsToRender : tagsToRender.slice(0, 15);
    const hiddenCount = tagsToRender.length - 15;

    return (
        <div className="flex flex-col border-t border-slate-100 bg-white relative z-20">
            {/* Minimalist Premium categories section: 2 rows of 4 items structured grid */}
            <div className="border-b border-slate-50/50 bg-white">
                <div className="grid grid-cols-4 gap-2 overflow-x-auto md:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4 py-3 whitespace-nowrap scroll-smooth">
                    {categoryList.slice(0, 8).map(cat => (
                        <button
                            key={cat.id || 'all'}
                            onClick={() => {                
                                logger.debug('[FilterPanel] Category clicked:', cat.id);
                                setCategory(cat.id);
                            }}
                            onMouseEnter={() => prefetchCategoryPhotos(cat.id)}
                            className={cn(
                                "text-[11px] font-black h-8 px-4 rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer pointer-events-auto active:scale-95 shrink-0 select-none shadow-sm capitalize",
                                urlFilters.categoryId === cat.id || (urlFilters.categoryId !== null && cat.id !== null && String(urlFilters.categoryId) === String(cat.id))
                                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25 border-transparent' 
                                    : 'bg-[#F3F4F6] text-[#374151] border border-slate-100 hover:bg-[#E5E7EB]'
                            )}
                            title={cat.name || t.all}
                        >
                            {(cat.name || t.all || 'Unnamed')}
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
                             onClick={() => toggleExpanded()}
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
                        const isSelected = urlFilters.tagId === tag.id || (urlFilters.tagId !== null && tag.id !== null && String(urlFilters.tagId) === String(tag.id));

                        return (
                           <button
                               key={tag.id}
                               onClick={() => {
                                   setTagId(isSelected ? null : tag.id);
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
