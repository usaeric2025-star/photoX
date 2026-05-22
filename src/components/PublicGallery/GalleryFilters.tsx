import React, { useMemo } from 'react';
import { Search, X } from 'lucide-react';
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
import { useTagsDisplay } from '../../hooks/useTagsDisplay';

interface GalleryFiltersProps {
  settings?: AppSettings;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortOrder: 'newest' | 'oldest' | 'name';
  toggleSortOrder: () => void;
  columns: 2 | 3 | 5;
  setColumns: (val: 2 | 3 | 5) => void;
  showGroupsCollapsed: boolean;
  setShowGroupsCollapsed: (val: boolean) => void;
  categories: Category[];
  selectedCatCode: string | null;
  setSelectedCatCode: (id: string | null) => void;
  filterSubId: string | null;
  setFilterSubId: (id: string | null) => void;
  selectedTagIds: string[];
  setSelectedTagIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  sortedTags: Tag[];
  lang: string;
  t: any;
  onScrollToTop: () => void;
  showHotEffects?: boolean;
}

export const GalleryFilters: React.FC<GalleryFiltersProps> = ({
  settings,
  searchQuery,
  setSearchQuery,
  sortOrder,
  toggleSortOrder,
  columns,
  setColumns,
  showGroupsCollapsed,
  setShowGroupsCollapsed,
  categories,
  selectedCatCode,
  setSelectedCatCode,
  filterSubId,
  setFilterSubId,
  selectedTagIds,
  setSelectedTagIds,
  sortedTags,
  lang,
  t,
  onScrollToTop,
  showHotEffects = true
}) => {
  const { tagsToRender, pinnedIds, hotIds } = useTagsDisplay(sortedTags, settings);

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
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F7F7F7] border border-[#ECECEC] rounded-full py-1.5 pl-8 pr-8 text-[13px] font-normal text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:bg-white transition-all"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888]" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#888888] hover:text-[#1A1A1A] transition-colors"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          
          <div className="flex gap-1 shrink-0">
            <SortButton onClick={toggleSortOrder} label={sortOrder === 'oldest' ? t.sortOldest : t.sortNewest} />
            
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
                selected={!selectedCatCode} 
                onClick={() => { setSelectedCatCode(null); setFilterSubId(null); onScrollToTop(); }} 
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
                      handleSetSelectedTagIds(prev => (prev || []).includes(strTagId) ? [] : [strTagId]);
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
