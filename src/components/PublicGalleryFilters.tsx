import React, { useMemo } from 'react';
import { Search, ArrowDown, ArrowUp, LayoutGrid, Layers, Heart, X, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Tag, AppSettings } from '../types';
import { cn } from '../lib/utils';
import { toTitleCase } from '../lib/ui-helpers';

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
  const hotIds = useMemo(() => {
    const hotTagsCount = settings?.hot_tags_count ?? 9;
    const hotTagThreshold = settings?.hot_tag_threshold ?? 1;
    const pinnedIds = (settings?.pinned_tags || []).map(id => String(id));

    const candidates = sortedTags.filter(tag => 
      !tag.is_pinned && 
      !pinnedIds.includes(String(tag.id)) && 
      (tag.usage_count || 0) >= hotTagThreshold
    ).slice(0, hotTagsCount);
    
    return new Set(candidates.map(t => String(t.id)));
  }, [sortedTags, settings?.hot_tags_count, settings?.hot_tag_threshold, settings?.pinned_tags]);

  return (
    <div className="shrink-0 p-3 z-40 bg-brand-bg border-b border-brand-navy/5">
      <div className="space-y-2.5 pb-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/40 border border-brand-navy/5 rounded-xl py-2 pl-10 pr-10 text-base md:text-xs text-brand-navy placeholder-brand-navy/30 focus:outline-none focus:bg-white transition-colors shadow-sm"
            />
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-navy/30" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-navy/30 hover:text-brand-navy transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          
          <div className="flex gap-1.5 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleSortOrder(); }}
              className="w-9 h-9 bg-white border border-brand-navy/5 text-brand-navy rounded-xl flex items-center justify-center shadow-sm hover:bg-brand-navy/5 active:scale-95 transition-all text-blue-600 font-bold"
              title={sortOrder === 'oldest' ? t.sortOldest : t.sortNewest}
            >
              {sortOrder === 'oldest' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
            </button>
            <div className="flex bg-white/40 border border-brand-navy/10 rounded-xl p-0.5 shadow-sm">
              {[2, 3, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setColumns(num as 2 | 3 | 5)}
                  className={cn(
                    "w-8 h-8 rounded-[10px] flex items-center justify-center text-[10px] font-black transition-all relative overflow-hidden",
                    columns === num 
                      ? "bg-brand-navy text-brand-bg shadow-sm" 
                      : "text-brand-navy/30 hover:text-brand-navy hover:bg-white/50"
                  )}
                  title={`${num} columns`}
                >
                  {num}
                  {columns === num && (
                    <motion.div 
                      layoutId="active-col"
                      className="absolute inset-0 bg-brand-navy -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
            <button
                onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
                className={`w-9 h-9 rounded-xl transition-all border shadow-sm flex items-center justify-center ${showGroupsCollapsed ? 'bg-brand-navy border-brand-navy text-brand-bg' : 'bg-white border-brand-navy/10 text-brand-navy/40 hover:text-brand-navy'}`}
                title={showGroupsCollapsed ? "Show All" : "Group Photos"}
            >
                <Layers size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 px-0.5">
            <button 
              onClick={() => { setSelectedCatCode(null); setFilterSubId(null); setSelectedTagIds(() => []); onScrollToTop(); }}
              className={`w-full h-[34px] rounded-md text-[11px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${!selectedCatCode && selectedTagIds.length === 0 ? 'bg-brand-navy border-brand-navy text-brand-bg' : 'bg-white border-brand-navy/10 text-brand-navy/60'}`}
            >
              {t.allCats}
            </button>
            
            {categories
              .map(cat => {
                const displayName = lang === 'zh' ? (cat.zh || cat.name) : lang === 'ms' ? (cat.ms || cat.name) : (cat.en || cat.name);
                return (
                  <button 
                    key={cat.id}
                    onClick={() => { 
                      setSelectedCatCode(cat.id); 
                      setFilterSubId(null);
                      setSelectedTagIds(() => []);
                      onScrollToTop();
                    }}
                    className={`w-full h-[34px] rounded-md text-[11px] font-bold uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${(String(selectedCatCode) === String(cat.id) || String(selectedCatCode) === String(cat.code)) ? 'bg-brand-navy border-brand-navy text-brand-bg' : 'bg-white border-brand-navy/10 text-brand-navy/60'}`}
                  >
                    {displayName}
                  </button>
                );
              })}
        </div>
      </div>
      
      <div className="pt-1.5 border-t border-brand-navy/5 space-y-1.5">
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
                      className={`px-3 py-1 rounded-xl text-[9px] font-bold tracking-wide whitespace-nowrap border-2 transition-all ${filterSubId === sub.id ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white/80 border-slate-100 text-slate-500 hover:border-slate-300'}`}
                    >
                      {sub.name}
                    </button>
                  ));
                })()}
              </motion.div>
            )}
          </AnimatePresence>

        <div className="relative overflow-hidden">
          <div className="flex flex-wrap gap-1.5 items-start max-h-[80px] overflow-y-auto pb-4 content-start scrollbar-hide">
            {sortedTags.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-6 w-16 bg-brand-navy/5 animate-pulse rounded-xl" />
              ))
            ) : (
              sortedTags.map(tag => {
                const strTagId = String(tag.id);
                const isSelected = (selectedTagIds || []).includes(strTagId);
                const isPinned = !!tag.is_pinned;
                const isHot = !isPinned && hotIds.has(strTagId);
                
                return (
                  <button 
                    key={strTagId}
                    onClick={() => { 
                      setSelectedTagIds(prev => (prev || []).includes(strTagId) ? [] : [strTagId]);
                      // Note: We don't clear categories here unless they conflict, 
                      // but typically users want to filter tags within category.
                      // If they want "All Cats", they click the specific button.
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-[9px] font-black transition-all border-2 shadow-sm flex items-center gap-1 shrink-0",
                      isSelected 
                        ? 'bg-brand-navy border-brand-navy text-brand-bg shadow-md z-10' 
                        : (isPinned || isHot) 
                          ? "border-brand-gold/30 bg-brand-gold/5 text-brand-gold hover:border-brand-gold/50 hover:bg-brand-gold/10 shadow-inner"
                          : 'bg-white border-slate-100 text-brand-navy/30 hover:text-brand-navy hover:border-brand-navy/20'
                    )}
                  >
                    {!isPinned && !isHot && <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-white" : "bg-slate-200"
                    )} />}
                    {tag.zh || tag.name}
                    {isPinned && <Pin size={8} className={cn("fill-brand-gold text-brand-gold", isSelected ? "text-white fill-white" : "")} />}
                    {isHot && <span className={cn(
                      "text-[7px] px-1 rounded font-black tracking-tighter shadow-sm",
                      isSelected ? "bg-white text-brand-navy" : "bg-brand-gold text-brand-bg"
                    )}>HOT</span>}
                  </button>
                );
              })
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-brand-bg/90 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
