import React, { useState, useEffect } from 'react';
import { Search, X, LayoutGrid, Grid3X3, Layers, ArrowDown, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGalleryContext } from '../../context/GalleryContext';

interface Props {
  displayMode: 'grid' | 'list';
  setDisplayMode: (m: 'grid' | 'list') => void;
  showGroupsCollapsed: boolean;
  setShowGroupsCollapsed: (s: boolean) => void;
  appLang: string;
}

export const SearchAndFilter: React.FC<Props> = ({ 
    displayMode, setDisplayMode, 
    showGroupsCollapsed, setShowGroupsCollapsed,
    appLang 
}) => {
  const {
    searchQuery, setSearchQuery,
    filterCatId, setFilterCatId,
    filterSubId, setFilterSubId,
    filterTagIds, setFilterTagIds,
    sortOrder, setSortOrder,
    categories,
    tags
  } = useGalleryContext();

  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync local search when context search changes (e.g. cleared elsewhere)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    setSearchQuery(val); // Context handles the debounce internaly now
  };

  return (
    <div className="bg-[#FDFAF6] border-b border-[#1D3557]/5 px-6 py-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1D3557]/30 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="搜索产品..."
            className="w-full bg-white/60 border border-[#1D3557]/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:bg-white transition-all outline-none text-[#1D3557] placeholder-[#1D3557]/30 shadow-inner"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {localSearch && (
            <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1D3557]/30 hover:text-[#1D3557]/60 p-1">
              <X size={14} />
            </button>
          )}
        </div>
        <button 
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm active:scale-95 ${sortOrder === 'asc' ? 'bg-[#D4A853] border-[#D4A853] text-white' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/50'}`}
          title={sortOrder === 'desc' ? "按时间正序" : "按时间倒序"}
        >
          {sortOrder === 'desc' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
        </button>
        <button 
          onClick={() => setDisplayMode(displayMode === 'grid' ? 'list' : 'grid')}
          className="w-10 h-10 rounded-2xl border transition-all flex items-center justify-center bg-white border-[#1D3557]/10 text-[#1D3557]/40 hover:text-[#1D3557] shadow-sm active:scale-95"
          title={displayMode === 'grid' ? "切换至列表" : "切换至网格"}
        >
          {displayMode === 'grid' ? <LayoutGrid size={18} /> : <Grid3X3 size={18} />}
        </button>
        <button 
          onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
          className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm active:scale-95 ${showGroupsCollapsed ? 'bg-[#1D3557] border-[#1D3557] text-white' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/50 hover:text-[#1D3557]'}`}
          title={showGroupsCollapsed ? "展开群组" : "合并群组"}
        >
          <Layers size={18} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button 
          onClick={() => { 
            setFilterCatId(null); 
            setFilterSubId(null); 
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${!filterCatId ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
        >
          全部产品
        </button>
        {categories
          .filter((cat: any) => {
            const n = (cat.name || '').toLowerCase();
            const z = (cat.zh || '').toLowerCase();
            return !['all', '全部', '全部产品', '全部產品'].includes(n) && !['全部', '全部产品', '全部產品'].includes(z);
          })
          .map((cat: any) => {
            const displayName = appLang === 'zh' ? (cat.zh || cat.name) : appLang === 'ms' ? (cat.ms || cat.name) : (cat.en || cat.name);
            return (
              <button 
                key={cat.id}
                onClick={() => { 
                  setFilterCatId(cat.id); 
                  setFilterSubId(null); 
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${filterCatId === cat.id ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
              >
                {displayName}
              </button>
            );
          })}
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
                  全部
                </button>
                {(() => {
                  const activeCat = categories.find(c => c.id === filterCatId);
                  return (activeCat?.subcategories || [])
                    .filter((s: any) => {
                      const n = (s.name || '').toLowerCase();
                      return !['all', '全部', '全部产品'].includes(n);
                    })
                    .map((sub: any) => (
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
              {tags.map((tag: any) => (
                <button 
                  key={tag.id}
                  onClick={() => setFilterTagIds(filterTagIds.includes(tag.id) ? filterTagIds.filter(t => t !== tag.id) : [...filterTagIds, tag.id])}
                  className={`px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm ${filterTagIds.includes(tag.id) ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white/40 border-[#1D3557]/10 text-[#1D3557]/40 hover:bg-white'}`}
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
};
