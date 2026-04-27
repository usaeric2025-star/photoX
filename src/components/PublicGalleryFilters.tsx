import React from 'react';
import { Search, ArrowDown, ArrowUp, LayoutGrid, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Tag } from '../types';

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
}

export const PublicGalleryFilters: React.FC<PublicGalleryFiltersProps> = ({
  searchQuery, setSearchQuery, sortOrder, toggleSortOrder, columns, setColumns,
  showGroupsCollapsed, setShowGroupsCollapsed, categories,
  selectedCatCode, setSelectedCatCode, selectedSubId, setSelectedSubId,
  selectedTagIds, setSelectedTagIds, sortedTags, lang, t
}) => {
  return (
    <div className="shrink-0 p-3 z-40 bg-[#FDFAF6] space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-[#1D3557]/10 rounded-2xl py-2.5 pl-11 pr-4 text-sm text-[#1D3557] placeholder-[#1D3557]/30 focus:outline-none focus:bg-white transition-all shadow-inner"
          />
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1D3557]/30" />
        </div>
        
        <div className="flex gap-1 sm:gap-2 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleSortOrder(); }}
            className="w-10 sm:w-10 h-10 bg-white border border-[#1D3557]/10 text-[#1D3557] rounded-xl flex items-center justify-center shadow-sm hover:bg-[#1D3557]/5 active:scale-95 transition-all"
            title={sortOrder === 'desc' ? t.sortOldest : t.sortNewest}
          >
            {sortOrder === 'desc' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
          </button>
          <button
              onClick={() => {
                if (columns === 2) setColumns(3);
                else if (columns === 3) setColumns(5);
                else setColumns(2);
              }}
              className="w-10 sm:w-auto px-2 sm:px-4 h-10 rounded-xl transition-all border shadow-sm flex items-center justify-center bg-white border-[#1D3557]/10 text-[#1D3557] gap-1 sm:gap-2"
              title={`Switch layout`}
          >
              <LayoutGrid size={16} className="opacity-40" />
              <span className="font-black text-xs hidden sm:inline">{columns}</span>
          </button>
          <button
              onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
              className={`w-10 sm:w-10 h-10 rounded-xl transition-all border shadow-sm flex items-center justify-center ${showGroupsCollapsed ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/40 hover:text-[#1D3557]'}`}
              title={showGroupsCollapsed ? "Show All" : "Group Photos"}
          >
              <Layers size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 px-1">
          <button 
            onClick={() => { setSelectedCatCode(null); setSelectedSubId(null); }}
            className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${!selectedCatCode ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
          >
            {t.allCats}
          </button>
          
           {/* Unified categories system (from table) */}
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
                    window.scrollTo({ top: 0, behavior: 'instant' }); 
                  }}
                  className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${selectedCatCode === cat.id ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
                >
                  {displayName}
                </button>
              );
            })}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {selectedCatCode && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-1.5"
              >
                {(() => {
                  const currentCat = categories.find(c => c.id === selectedCatCode || c.code === selectedCatCode);
                  const subList = currentCat?.subcategories || [];
                  return Array.from(new Map(subList.map((s: any) => [s.id, s])).values())
                    .filter((s: any) => {
                      const n = (s.name || '').toLowerCase();
                      return !['all', '全部', '全部产品'].includes(n);
                    })
                    .map((sub: any) => (
                    <button 
                      key={sub.id}
                      onClick={() => setSelectedSubId(sub.id)}
                      className={`px-2 py-0.5 rounded-lg text-[8px] font-black tracking-widest whitespace-nowrap border transition-all ${selectedSubId === sub.id ? 'bg-[#D4A853] border-[#D4A853] text-white' : 'bg-white/50 border-[#1D3557]/5 text-[#1D3557]/40 font-medium'}`}
                    >
                      {sub.name}
                    </button>
                  ));
                })()}
              </motion.div>
            )}
          </AnimatePresence>

        <div className="flex flex-wrap gap-0.5 items-start max-h-[6rem] overflow-y-auto pb-1 content-start">
            {sortedTags.map(tag => (
              <button 
                key={tag.id}
                onClick={() => setSelectedTagIds(prev => prev.includes(tag.id) ? [] : [tag.id])}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border shadow-sm ${selectedTagIds.includes(tag.id) ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white/40 border-[#1D3557]/10 text-[#1D3557]/60'}`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </div>
    </div>
  );
};
