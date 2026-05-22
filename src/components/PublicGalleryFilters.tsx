import React, { useMemo } from 'react';
import { Search, ArrowDown, ArrowUp, LayoutGrid, Layers, Heart, X, Pin, Grid2X2, Grid3X3, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGalleryStore } from '../store';
import { Category, Tag, AppSettings } from '../types';
import { cn } from '../lib/utils';
import { toTitleCase } from '../lib/ui-helpers';

import { useTagsDisplay } from '../hooks/useTagsDisplay';

interface PublicGalleryFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortOrder: 'newest' | 'oldest' | 'name';
  toggleSortOrder: () => void;
  columns: number;
  setColumns: (val: 2 | 3 | 5) => void;
  showGroupsCollapsed: boolean;
  setShowGroupsCollapsed: (val: boolean) => void;
  categories: Category[];
  selectedCatCode: string | null;
  setSelectedCatCode: (id: string | null) => void;
  filterSubId: string | null;
  setFilterSubId: (id: string | null) => void;
  selectedTagIds: string[];
  setSelectedTagIds: (fn: (prev: string[]) => string[]) => void;
  sortedTags: Tag[];
  lang: string;
  t: Record<string, any>;
  onScrollToTop: () => void;
  showHotEffects?: boolean;
  settings?: AppSettings;
}

export const PublicGalleryFilters: React.FC<PublicGalleryFiltersProps> = ({
  searchQuery, setSearchQuery, sortOrder, toggleSortOrder, columns, setColumns,
  showGroupsCollapsed, setShowGroupsCollapsed, categories,
  selectedCatCode, setSelectedCatCode, filterSubId, setFilterSubId,
  selectedTagIds, setSelectedTagIds, sortedTags, lang, t,  onScrollToTop,
  showHotEffects = true, settings
}) => {
  const { tagsToRender, pinnedIds, hotIds } = useTagsDisplay(sortedTags, settings);

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
            <button 
              onClick={(e) => { e.stopPropagation(); toggleSortOrder(); }}
              className="w-8 h-8 bg-white border border-[#ECECEC] text-[#555555] rounded-full flex items-center justify-center hover:bg-[#F7F7F7] transition-all active:scale-95"
              title={sortOrder === 'oldest' ? t.sortOldest : t.sortNewest}
            >
              {sortOrder === 'oldest' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
            </button>
            
            <button
              onClick={() => {
                const next = columns === 2 ? 3 : columns === 3 ? 5 : 2;
                setColumns(next as 2 | 3 | 5);
              }}
              className="w-8 h-8 bg-white border border-[#ECECEC] text-[#555555] rounded-full flex items-center justify-center hover:bg-[#F7F7F7] transition-all active:scale-95"
              title={`${columns} columns`}
            >
              <LayoutGrid size={14} />
            </button>

            <button
                onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
                className={cn(
                  "w-8 h-8 rounded-full transition-all border flex items-center justify-center",
                  showGroupsCollapsed 
                    ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' 
                    : 'bg-white border-[#ECECEC] text-[#555555] hover:bg-[#F7F7F7]'
                )}
            >
                {showGroupsCollapsed ? <Layers size={14} /> : <Grid size={14} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1">
            <button 
              onClick={() => { setSelectedCatCode(null); setFilterSubId(null); setSelectedTagIds(() => []); onScrollToTop(); }}
              className={cn(
                "h-[32px] flex items-center justify-center rounded-[8px] text-[12px] font-bold transition-all border whitespace-nowrap",
                !selectedCatCode 
                  ? 'bg-[#1A1C3E] border-[#1A1C3E] text-white shadow-sm' 
                  : 'bg-white border-[#ECECEC] text-[#555555]'
              )}
            >
              {t.allCats.toUpperCase()}
            </button>
            
            {categories
              .slice(0, 7) 
              .map(cat => {
                const rawName = lang === 'zh' ? (cat.zh || cat.name) : lang === 'ms' ? (cat.ms || cat.name) : (cat.en || cat.name);
                const displayName = lang === 'zh' ? rawName : rawName.toUpperCase();
                const isActive = String(selectedCatCode) === String(cat.id) || String(selectedCatCode) === String(cat.code);
                return (
                  <button 
                    key={cat.id}
                    onClick={() => { 
                      setSelectedCatCode(cat.id); 
                      setFilterSubId(null);
                      setSelectedTagIds(() => []);
                      onScrollToTop();
                    }}
                    className={cn(
                      "h-[32px] flex items-center justify-center rounded-[8px] text-[12px] font-bold transition-all border whitespace-nowrap truncate px-1",
                      isActive 
                        ? 'bg-[#1A1C3E] border-[#1A1C3E] text-white shadow-sm' 
                        : 'bg-white border-[#ECECEC] text-[#555555]'
                    )}
                  >
                    {displayName}
                  </button>
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
                  <button 
                    key={sub.id}
                    onClick={() => { setFilterSubId(filterSubId === sub.id ? null : sub.id); onScrollToTop(); }}
                    className={cn(
                      "px-3 h-[28px] rounded-[6px] text-[12px] font-normal transition-all border",
                      filterSubId === sub.id 
                        ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' 
                        : 'bg-[#F5F5F5] border-transparent text-[#333333] hover:border-[#ECECEC]'
                    )}
                  >
                    {toTitleCase(sub.name)}
                  </button>
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
                const label = tag.zh || tag.name;
                const displayLabel = lang === 'zh' ? label : label.toUpperCase();
                
                return (
                  <button 
                    key={strTagId}
                    onClick={() => { 
                      setSelectedTagIds(prev => (prev || []).includes(strTagId) ? [] : [strTagId]);
                    }}
                    className={cn(
                      "px-3 h-[22px] rounded-full text-[9px] font-extrabold transition-all border flex items-center gap-1 shrink-0 whitespace-nowrap",
                      isSelected 
                        ? 'bg-[#0051BA] border-[#0051BA] text-white shadow-sm' 
                        : isPinned
                          ? 'border-amber-200 bg-amber-50/90 text-amber-700 shadow-xs'
                          : isHot
                            ? "border-[#E8BA5A]/50 bg-[#FFF9EA]/80 text-[#B8860B]"
                            : 'bg-[#F1F3F4]/70 border-transparent text-[#888888]'
                    )}
                  >
                    {displayLabel}
                    {isPinned && <Pin size={8} className="fill-current text-amber-600 rotate-45" />}
                    {isHot && (
                      <span className="text-[7px] font-black px-1.5 bg-[#FFB700] text-white rounded-[3px] tracking-tighter">
                        HOT
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
