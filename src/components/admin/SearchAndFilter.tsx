import React from 'react';
import { Search, X, LayoutGrid, Grid3X3, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  displayMode: 'grid' | 'list';
  setDisplayMode: (m: 'grid' | 'list') => void;
  showGroupsCollapsed: boolean;
  setShowGroupsCollapsed: (s: boolean) => void;
  filterCatId: string | null;
  setFilterCatId: (id: string | null) => void;
  filterSubId: string | null;
  setFilterSubId: (id: string | null) => void;
  filterTagIds: string[];
  setFilterTagIds: React.Dispatch<React.SetStateAction<string[]>>;
  dbCategories: any[];
  categories: any[];
  tags: any[];
  appLang: string;
}

export const SearchAndFilter: React.FC<Props> = ({ 
    searchQuery, setSearchQuery, displayMode, setDisplayMode, 
    showGroupsCollapsed, setShowGroupsCollapsed, filterCatId, setFilterCatId, 
    filterSubId, setFilterSubId, filterTagIds, setFilterTagIds, 
    dbCategories, categories, tags, appLang 
}) => (
    <div className="bg-[#FDFAF6] border-b border-[#1D3557]/5 px-6 py-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1D3557]/30 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="搜尋產品..."
            className="w-full bg-white/60 border border-[#1D3557]/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:bg-white transition-all outline-none text-[#1D3557] placeholder-[#1D3557]/30 shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1D3557]/30 hover:text-[#1D3557]/60 p-1">
              <X size={14} />
            </button>
          )}
        </div>
        <button 
          onClick={() => setDisplayMode(displayMode === 'grid' ? 'list' : 'grid')}
          className="w-10 h-10 rounded-2xl border transition-all flex items-center justify-center bg-white border-[#1D3557]/10 text-[#1D3557]/40 hover:text-[#1D3557] shadow-sm active:scale-95"
          title={displayMode === 'grid' ? "切換至大圖" : "切換至網格"}
        >
          {displayMode === 'grid' ? <LayoutGrid size={18} /> : <Grid3X3 size={18} />}
        </button>
        <button 
          onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
          className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm active:scale-95 ${showGroupsCollapsed ? 'bg-[#1D3557] border-[#1D3557] text-white' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/50 hover:text-[#1D3557]'}`}
          title={showGroupsCollapsed ? "展开群组" : "合併群組"}
        >
          <Layers size={18} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button 
          onClick={() => { setFilterCatId(null); setFilterSubId(null); }}
          className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${!filterCatId ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
        >
          全部产品
        </button>
        {dbCategories.map(cat => (
          <button 
            key={cat.code}
            onClick={() => { setFilterCatId(cat.code); setFilterSubId(null); }}
            className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${filterCatId === cat.code ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
          >
            {cat[appLang] || cat.zh}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {(filterCatId || tags.length > 0) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {filterCatId && (
              <div className="flex overflow-x-auto pb-1 gap-1.5 no-scrollbar">
                <button 
                  onClick={() => setFilterSubId(null)}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${!filterSubId ? 'bg-[#D4A853] border-[#D4A853] text-white shadow-md' : 'bg-white/50 border-[#1D3557]/5 text-[#1D3557]/40 font-medium'}`}
                >
                  ALL
                </button>
                {(() => {
                  const legacyMatchedCat = categories.find(c => c.name === dbCategories.find(dc => dc.code === filterCatId)?.zh || c.id === filterCatId);
                  return legacyMatchedCat?.subcategories.map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => setFilterSubId(sub.id)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest whitespace-nowrap border transition-all ${filterSubId === sub.id ? 'bg-[#D4A853] border-[#D4A853] text-white shadow-md' : 'bg-white/50 border-[#1D3557]/5 text-[#1D3557]/40 font-medium hover:text-[#1D3557]/60'}`}
                    >
                      {sub.name}
                    </button>
                  ));
                })()}
              </div>
            )}
            
            <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar scroll-smooth px-1">
              {tags.map(tag => (
                <button 
                  key={tag.id}
                  onClick={() => setFilterTagIds(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                  className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm ${filterTagIds.includes(tag.id) ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white/40 border-[#1D3557]/10 text-[#1D3557]/40 hover:bg-white'}`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
);
