import React, { useTransition } from 'react';
import { Search, ArrowDown, ArrowUp, LayoutGrid, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Tag } from '../types';
import { cn } from '../lib/utils';

interface PublicGalleryFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortOrder: 'asc' | 'desc';
  toggleSortOrder: () => void;
  columns: number;
  setColumns: (val: any) => void;
  showGroupsCollapsed: boolean;
  setShowGroupsCollapsed: (val: boolean) => void;
  categories: any[];
  selectedCatCode: string | null;
  setSelectedCatCode: (id: string | null) => void;
  selectedSubId: string | null;
  setSelectedSubId: (id: string | null) => void;
  selectedTagIds: string[];
  setSelectedTagIds: (fn: (prev: string[]) => string[]) => void;
  sortedTags: Tag[];
  lang: string;
  t: any;
  onScrollToTop: () => void;
  showHotEffects?: boolean;
}

export const PublicGalleryFilters: React.FC<PublicGalleryFiltersProps> = ({
  searchQuery, setSearchQuery, sortOrder, toggleSortOrder, columns, setColumns,
  showGroupsCollapsed, setShowGroupsCollapsed, categories,
  selectedCatCode, setSelectedCatCode, selectedSubId, setSelectedSubId,
  selectedTagIds, setSelectedTagIds, sortedTags, lang, t, onScrollToTop,
  showHotEffects = true
}) => {
  const [isPending, startTransition] = useTransition();
  
  return (
    <div className="shrink-0 p-3 z-40 bg-[#FDFAF6] border-b border-[#1D3557]/5">
      <div className="space-y-2.5 pb-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/40 border border-[#1D3557]/5 rounded-xl py-2 pl-10 pr-4 text-xs text-[#1D3557] placeholder-[#1D3557]/30 focus:outline-none focus:bg-white transition-all shadow-sm"
            />
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1D3557]/30" />
          </div>
          
          <div className="flex gap-1.5 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleSortOrder(); }}
              className="w-9 h-9 bg-white border border-[#1D3557]/5 text-[#1D3557] rounded-xl flex items-center justify-center shadow-sm hover:bg-[#1D3557]/5 active:scale-95 transition-all"
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
                className="w-9 h-9 rounded-xl transition-all border shadow-sm flex items-center justify-center bg-white border-[#1D3557]/5 text-[#1D3557]"
                title={`Switch layout`}
            >
                <LayoutGrid size={16} className="opacity-40" />
            </button>
            <button
                onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
                className={`w-9 h-9 rounded-xl transition-all border shadow-sm flex items-center justify-center ${showGroupsCollapsed ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/40 hover:text-[#1D3557]'}`}
                title={showGroupsCollapsed ? "Show All" : "Group Photos"}
            >
                <Layers size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1 px-0.5">
            <button 
              onClick={() => { setSelectedCatCode(null); setSelectedSubId(null); onScrollToTop(); }}
              className={`w-full py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${!selectedCatCode ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
            >
              {t.allCats}
            </button>
            
            {categories
              .filter(c => c.name && c.name.trim())
              .filter(c => {
                const n = (c.name || '').toLowerCase();
                const z = (c.zh || '').toLowerCase();
                return !['all', '全部', '全部产品', '全部產品'].includes(n) && !['全部', '全部产品', '全部產品'].includes(z);
              })
              .map(cat => {
                const displayName = lang === 'zh' ? (cat.zh || cat.name) : lang === 'ms' ? (cat.ms || cat.name) : (cat.en || cat.name);
                return (
                  <button 
                    key={cat.id}
                    onClick={() => { 
                      setSelectedCatCode(cat.id); 
                      setSelectedSubId(null);
                      onScrollToTop();
                    }}
                    className={`w-full py-0.5 rounded-md text-[8px] font-bold uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${selectedCatCode === cat.id ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
                  >
                    {displayName}
                  </button>
                );
              })}
        </div>
      </div>
      
      <div className="pt-3 border-t-2 border-[#1D3557]/5 space-y-3">
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
                    .filter((s: any) => {
                      const n = (s.name || '').toLowerCase();
                      return !['all', '全部', '全部產品', '全部产品'].includes(n);
                    })
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

        <div className="relative bg-slate-100/50 rounded-[2rem] p-2 border-2 border-white shadow-[inner_0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="flex flex-wrap gap-1.5 items-start max-h-[8rem] overflow-y-auto pb-6 content-start px-2 pt-2 scrollbar-hide">
              {sortedTags.map(tag => {
                const strTagId = String(tag.id);
                const isSelected = selectedTagIds.includes(strTagId);
                const isHot = showHotEffects && ((tag.count || 0) > 5 || (tag.name?.length || 0) > 6);
                
                const toTitleCase = (str: string) => {
                  if (!str) return '';
                  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                };
                return (
                  <button 
                    key={strTagId}
                    onClick={() => { 
                      startTransition(() => {
                        setSelectedTagIds(prev => prev.includes(strTagId) ? [] : [strTagId]);
                      });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border-2 shadow-sm flex items-center gap-1.5",
                      isSelected 
                        ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6] scale-105 z-10' 
                        : 'bg-white border-slate-100 text-[#1D3557]/40 hover:text-[#1D3557] hover:border-[#1D3557]/20',
                      isHot && !isSelected && "border-amber-200/50 bg-amber-50/80 text-amber-700/80 hot-tag-breath",
                      isHot && isSelected && "ring-4 ring-amber-400/20"
                    )}
                  >
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      isSelected ? (showHotEffects ? "bg-amber-400 animate-pulse" : "bg-white") : (isHot ? "bg-amber-400" : "bg-slate-200")
                    )} />
                    {toTitleCase(tag.name)}
                    {isHot && !isSelected && <span className="text-[8px] bg-amber-400 text-white px-2 py-0.5 rounded-full font-black tracking-tighter">HOT</span>}
                  </button>
                );
              })}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-100/80 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
