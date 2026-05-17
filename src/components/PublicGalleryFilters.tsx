import React from 'react';
import { Search, ArrowDown, ArrowUp, LayoutGrid, Layers, Heart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Tag, AppSettings } from '../types';
import { cn } from '../lib/utils';
import { toTitleCase } from '../lib/ui-helpers';

interface PublicGalleryFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortOrder: 'asc' | 'desc';
  toggleSortOrder: () => void;
  columns: number;
  setColumns: (val: 2 | 3 | 5) => void;
  showGroupsCollapsed: boolean;
  setShowGroupsCollapsed: (val: boolean) => void;
  categories: Category[];
  selectedCatCode: string | null;
  setSelectedCatCode: (id: string | null) => void;
  selectedSubId: string | null;
  setSelectedSubId: (id: string | null) => void;
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
  selectedCatCode, setSelectedCatCode, selectedSubId, setSelectedSubId,
  selectedTagIds, setSelectedTagIds, sortedTags, lang, t, onScrollToTop,
  showHotEffects = true, settings
}) => {
  // Pick random fallback hot tags if needed
  const hotTagsSet = React.useMemo(() => {
    if (!showHotEffects) return new Set<string>();
    const count = settings?.hotTagsCount || 9;
    const pinned = settings?.pinnedTags || [];
    const set = new Set<string>(pinned);
    
    if (set.size < count && sortedTags.length > 0) {
      const candidates = sortedTags.filter(t => !set.has(String(t.id)));
      
      // Use stable sorting based on name to avoid random flicker
      const sortedCandidates = [...candidates].sort((a, b) => a.name.localeCompare(b.name));
      const needed = count - set.size;
      for (let i = 0; i < needed && i < sortedCandidates.length; i++) {
         set.add(String(sortedCandidates[i].id));
      }
    }
    return set;
  }, [settings?.hotTagsCount, settings?.pinnedTags, sortedTags, showHotEffects]);

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
              className="w-9 h-9 bg-white border border-brand-navy/5 text-brand-navy rounded-xl flex items-center justify-center shadow-sm hover:bg-brand-navy/5 active:scale-95 transition-all"
              title={sortOrder === 'desc' ? t.sortOldest : t.sortNewest}
            >
              {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
            </button>
            <button
                onClick={() => {
                  if (columns === 2) setColumns(3);
                  else if (columns === 3) setColumns(5);
                  else setColumns(2);
                }}
                className="w-9 h-9 rounded-xl transition-all border shadow-sm flex items-center justify-center bg-white border-brand-navy/5 text-brand-navy"
                title={`Switch layout`}
            >
                <LayoutGrid size={16} className="opacity-40" />
            </button>
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
              onClick={() => { setSelectedCatCode(null); setSelectedSubId(null); setSelectedTagIds(() => []); onScrollToTop(); }}
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
                      setSelectedSubId(null);
                      setSelectedTagIds(() => []);
                      onScrollToTop();
                    }}
                    className={`w-full h-[34px] rounded-md text-[11px] font-bold uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${selectedCatCode === cat.id ? 'bg-brand-navy border-brand-navy text-brand-bg' : 'bg-white border-brand-navy/10 text-brand-navy/60'}`}
                  >
                    {displayName}
                  </button>
                );
              })}
        </div>
      </div>
      
      <div className="pt-1.5 border-t border-brand-navy/5 space-y-1.5">
        <AnimatePresence>
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
                      onClick={() => { setSelectedSubId(selectedSubId === sub.id ? null : sub.id); onScrollToTop(); }}
                      className={`px-3 py-1 rounded-xl text-[9px] font-bold tracking-wide whitespace-nowrap border-2 transition-all ${selectedSubId === sub.id ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white/80 border-slate-100 text-slate-500 hover:border-slate-300'}`}
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
            {React.useMemo(() => {
                return [...sortedTags].sort((a, b) => {
                  const aPinned = (settings?.pinnedTags || []).includes(String(a.id));
                  const bPinned = (settings?.pinnedTags || []).includes(String(b.id));
                  if (aPinned && !bPinned) return -1;
                  if (!aPinned && bPinned) return 1;
                  
                  const aHot = hotTagsSet.has(String(a.id));
                  const bHot = hotTagsSet.has(String(b.id));
                  if (aHot && !bHot) return -1;
                  if (!aHot && bHot) return 1;
                  
                  return a.name.localeCompare(b.name, undefined, { numeric: true });
                });
              }, [sortedTags, settings?.pinnedTags, hotTagsSet]).map(tag => {
                const strTagId = String(tag.id);
                const isSelected = (selectedTagIds || []).includes(strTagId);
                const isHot = hotTagsSet.has(strTagId);
                const isPinned = (settings?.pinnedTags || []).includes(strTagId);
                
                return (
                  <button 
                    key={strTagId}
                    onClick={() => { 
                      setSelectedTagIds(prev => (prev || []).includes(strTagId) ? [] : [strTagId]);
                      setSelectedCatCode(null);
                      setSelectedSubId(null);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-[9px] font-black transition-colors border-2 shadow-sm flex items-center gap-1",
                      isSelected 
                        ? 'bg-brand-navy border-brand-navy text-brand-bg shadow-md z-10' 
                        : 'bg-white border-slate-100 text-brand-navy/40 hover:text-brand-navy hover:border-brand-navy/20',
                      isHot && !isSelected && "border-brand-gold/30 bg-brand-gold/5 text-brand-gold hover:border-brand-gold/50 hover:bg-brand-gold/10"
                    )}
                  >
                    {!isHot && <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-white" : "bg-slate-200"
                    )} />}
                    {toTitleCase(tag.name)}
                    {isPinned && !isSelected && <span className="bg-brand-gold text-white p-0.5 rounded-full shadow-sm flex items-center justify-center"><Heart size={8} className="fill-white"/></span>}
                    {isHot && !isPinned && !isSelected && <span className="text-[8px] bg-brand-gold/20 text-brand-gold px-1.5 py-[1px] rounded font-black tracking-tighter">HOT</span>}
                  </button>
                );
              })}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-brand-bg/90 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
