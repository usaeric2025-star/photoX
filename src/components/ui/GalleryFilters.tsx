import React, { useMemo, useState, useEffect } from 'react';
import { Search, X, Sparkles, Pin, Share, Globe } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { FilterChip } from '../../components/ui/FilterChip';
import { CategoryChip } from '../../components/ui/CategoryChip';
import { SubCategoryChip } from '../../components/ui/SubCategoryChip';
import { SortButton } from '../../components/ui/SortButton';
import { LayoutButton } from '../../components/ui/LayoutButton';
import { GroupToggle } from '../../components/ui/GroupToggle';
import { motion, AnimatePresence } from 'motion/react';
import { useGalleryStore } from '../../store';
import { Category, Tag, AppSettings } from '../../types';
import { cn } from '../../lib/utils';
import { toTitleCase } from '../../lib/ui-helpers';
import { useTagsDisplay } from '@/hooks';

import { translations } from '../../lib/translations';

import { useCategoriesQuery, useTagsQuery, useSettings } from '../../hooks';

interface GalleryFiltersProps {
  onScrollToTop: () => void;
  showHotEffects?: boolean;
  variant?: 'admin' | 'public';
  onBatchAiIdentify?: () => void;
  isAnalyzing?: boolean;
  batchProgress?: { current: number; total: number };
  onSetLang?: (lang: string) => void;
  onShare?: () => void;
}

export const GalleryFilters: React.FC<GalleryFiltersProps> = ({
  onScrollToTop,
  showHotEffects = true,
  variant = 'public',
  onBatchAiIdentify,
  isAnalyzing,
  batchProgress,
  onSetLang,
  onShare
}) => {
  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { settings } = useSettings();
  const searchQuery = useGalleryStore(s => s.searchQuery);
  const setSearchQuery = useGalleryStore(s => s.setSearchQuery);
  const sortOrder = useGalleryStore(s => s.sortOrder);
  const setSortOrder = useGalleryStore(s => s.setSortOrder);
  const columns = useGalleryStore(s => s.columns);
  const setColumns = useGalleryStore(s => s.setColumns);
  const showGroupsCollapsed = useGalleryStore(s => s.showGroupsCollapsed);
  const setShowGroupsCollapsed = useGalleryStore(s => s.setShowGroupsCollapsed);
  const selectedCatCode = useGalleryStore(s => s.filterCatId);
  const setSelectedCatCode = useGalleryStore(s => s.setFilterCatId);
  const filterSubId = useGalleryStore(s => s.filterSubId);
  const setFilterSubId = useGalleryStore(s => s.setFilterSubId);
  const selectedTagIds = useGalleryStore(s => s.filterTagIds);
  const setSelectedTagIds = useGalleryStore(s => s.setFilterTagIds);
  const lang = useGalleryStore(s => s.appLang);

  const t = useMemo(() => translations[lang] || translations['zh'], [lang]);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  const { tagsToRender, pinnedIds, hotIds } = useTagsDisplay(tags, settings);

  // Local state for instant typing responsive feedback
  const [localSearch, setLocalSearch] = useState(searchQuery || '');

  // Keep local search value synced if the searchQuery prop resets from external actions
  useEffect(() => {
    setLocalSearch(searchQuery || '');
  }, [searchQuery]);

  // Debounced parent state update (500ms delay to make it smooth, prevent "always flashing")
  const debouncedSetSearchQuery = useDebouncedCallback((val: string) => {
    setSearchQuery(val);
  }, 500);

  // Safely wrap setSelectedTagIds to conform to whatever callback is needed
  const handleSetSelectedTagIds = (updater: string[] | ((prev: string[]) => string[])) => {
    if (typeof updater === 'function') {
      setSelectedTagIds(updater as any);
    } else {
      setSelectedTagIds(() => updater);
    }
  };

  return (
    <div className="shrink-0 px-2 sm:px-3 pt-2 pb-1.5 z-40 bg-white border-b border-[#ECECEC]">
      <div className="space-y-1.5 pb-1">
        <div className="flex gap-1.5">
          {variant === 'public' && onShare && (
             <button onClick={onShare} className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-[#F7F7F7] border border-[#ECECEC] text-[#888] hover:text-[#1A1A1A] transition-colors" title={t.share}>
               <Share size={16} />
             </button>
          )}

          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={t.search}
              value={localSearch}
              onChange={(e) => {
                const val = e.target.value;
                setLocalSearch(val);
                debouncedSetSearchQuery(val);
              }}
              className="w-full bg-[#F7F7F7] border border-[#ECECEC] rounded-full py-1.5 pl-8 pr-8 text-[13px] font-normal text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:bg-white transition-all"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888]" />
            {localSearch && (
              <button
                onClick={() => {
                  setLocalSearch('');
                  debouncedSetSearchQuery.cancel();
                  setSearchQuery('');
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#888888] hover:text-[#1A1A1A] transition-colors"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          
          <div className="flex gap-1 shrink-0">
            {variant === 'admin' && onBatchAiIdentify && (
                <button 
                  onClick={onBatchAiIdentify}
                  disabled={isAnalyzing}
                  className={`h-9 px-2.5 rounded-xl flex items-center justify-center transition-all ${isAnalyzing ? 'bg-purple-600 text-white shadow-lg scale-105' : 'text-purple-600/70 hover:text-purple-600 bg-white border border-purple-600/20 shadow-sm'}`}
                  title={t.batchAi}
                >
                  {isAnalyzing ? (
                    batchProgress?.current > 0 ? (
                      <span className="text-[10px] font-bold text-white">{batchProgress.current}</span>
                    ) : (
                      <Sparkles size={16} className="animate-spin" />
                    )
                  ) : (
                    <Sparkles size={16} className="mr-1" />
                  )}
                  {!isAnalyzing && <span className="text-[11px] font-bold">AI</span>}
                </button>
            )}

            <SortButton 
              onClick={toggleSortOrder} 
              label={sortOrder === 'oldest' ? t.sortOldest : t.sortNewest} 
              selected={sortOrder === 'oldest'} 
            />
            
            <LayoutButton 
              isGrid={columns !== 2} 
              onClick={() => {
                const next = columns === 2 ? 3 : columns === 3 ? 5 : 2;
                setColumns(next as 2 | 3 | 5);
              }}
            />
            <GroupToggle 
                showGroupsCollapsed={showGroupsCollapsed} 
                onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)} 
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1">
            <CategoryChip 
                name={t.allCats.toUpperCase()} 
                selected={!selectedCatCode && (!selectedTagIds || selectedTagIds.length === 0)} 
                onClick={() => { setSelectedCatCode(null); setFilterSubId(null); setSelectedTagIds([]); onScrollToTop(); }} 
            />
            
            {categories
              .slice(0, 7) 
              .map(cat => {
                const rawName = lang === 'zh' ? (cat.zh || cat.name) : lang === 'ms' ? (cat.ms || cat.name) : (cat.en || cat.name);
                const displayName = lang === 'zh' ? rawName : rawName.toUpperCase();
                const isActive = String(selectedCatCode) === String(cat.id) || String(selectedCatCode) === String(cat.code);
                return (
                  <CategoryChip
                    key={cat.id}
                    name={displayName}
                    selected={isActive}
                    onClick={() => { 
                      setSelectedCatCode(cat.id); 
                      setFilterSubId(null);
                      setSelectedTagIds([]);
                      onScrollToTop();
                    }}
                  />
                );
              })}
        </div>
      </div>
      
      <div className="pt-1 border-t border-[#F7F7F7] space-y-1">
        <AnimatePresence initial={false}>
          {selectedCatCode && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 pb-2 px-1"
              >
                {(() => {
                  const currentCat = categories.find(c => (c.id === selectedCatCode || c.code === selectedCatCode));
                  const subList = currentCat?.subcategories || [];
                  return Array.from(new Map(subList.map((s: any) => [s.id, s])).values())
                    .map((sub: any) => (
                  <SubCategoryChip
                    key={sub.id}
                    name={toTitleCase(sub.name)}
                    selected={filterSubId === sub.id}
                    onClick={() => { setFilterSubId(filterSubId === sub.id ? null : sub.id); onScrollToTop(); }}
                  />
                ));
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-y-auto max-h-[85px] scrollbar-hide pb-1 -mx-1 px-1">
          <div className="flex flex-wrap gap-1.5">
            {tagsToRender.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[22px] w-14 bg-[#F5F5F5] animate-pulse rounded-full shrink-0" />
               ))
            ) : (
              tagsToRender.map((tag, idx) => {
                const strTagId = String(tag.id);
                const isSelected = (selectedTagIds || []).includes(strTagId);
                const isPinned = !!tag.is_pinned || pinnedIds.includes(strTagId);
                const isHot = !isPinned && hotIds.has(strTagId);
                return (
                  <FilterChip
                    key={strTagId}
                    label={lang === 'zh' ? (tag.zh || tag.name) : (tag.zh || tag.name).toUpperCase()}
                    selected={isSelected}
                    pinned={isPinned}
                    hot={isHot}
                    onClick={() => { 
                      setSelectedCatCode(null);
                      setFilterSubId(null);
                      setSelectedTagIds([strTagId]);
                      onScrollToTop();
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
