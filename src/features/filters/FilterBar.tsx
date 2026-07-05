import { useState, useEffect } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { SearchInput } from './SearchInput.js';
import { SortToggle } from './SortToggle.js';
import { CategoryGrid } from './CategoryGrid.js';
import { TagGrid } from './TagGrid.js';
import { ColumnsToggle } from '#src/components/layout/ColumnsToggle.js';
import { GroupToggle } from '#src/components/ui/GroupToggle.js';
import { useFilters, useFilterState } from '#src/hooks/index.js';
import { useTags } from '#src/hooks/tag/index.js';
import { cn } from '#lib/utils.js';

interface FilterBarProps {
  mode: 'public' | 'admin';
  className?: string;
}

export function FilterBar({ mode, className }: FilterBarProps) {
  const isAdmin = mode === 'admin';
  const { showGroupsCollapsed, setShowGroupsCollapsed } = useFilters();
  const [showTags, setShowTags] = useState(false);
  const { filters, updateFilters } = useFilterState();
  
  // 延遲載入非關鍵資料 (P1)
  const [isReadyForNonCritical, setIsReadyForNonCritical] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReadyForNonCritical(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const { tags: allTags } = useTags({ enabled: isReadyForNonCritical });

  const selectedTags = allTags?.filter(tag => filters.tagIds.includes(String(tag.id))) || [];

  const removeTag = (tagId: string) => {
    updateFilters({
      tagIds: filters.tagIds.filter(id => id !== tagId)
    });
  };

  return (
    <div className={cn("flex-shrink-0 border-b bg-white", className)}>
      <div className="flex flex-row gap-2.5 items-center px-4 py-3 sm:px-6 max-w-full">
        <div className="flex-1 min-w-0">
          <SearchInput />
        </div>
        <div className="flex gap-2 shrink-0 items-center overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
          <button 
            onClick={() => setShowTags(!showTags)}
            className={cn(
              "h-10 px-3 sm:px-4 rounded-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 border",
              showTags 
                ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm"
            )}
            title={showTags ? '收起標籤' : '展開標籤'}
          >
            <span className="text-[13px] font-bold tracking-tight">Tags</span>
            <Icon name="chevron-down"
              size={16} 
              className={cn("transition-transform duration-300", showTags && "rotate-180")} 
            />
          </button>
          
          <div className="flex gap-2 items-center shrink-0">
            <SortToggle />
            <ColumnsToggle />
            <GroupToggle 
              showGroupsCollapsed={showGroupsCollapsed}
              onClick={() => {
                setShowGroupsCollapsed(!showGroupsCollapsed);
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="px-4 pb-3 space-y-3">
        {/* 分類 - 根據規範固定渲染 2 x 4 */}
        <CategoryGrid mode={mode} enabled={true} />

        {/* 已選標籤顯示與移除 */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center pt-1 animate-fade-in border-t border-slate-50 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active:</span>
            {selectedTags.map(tag => (
              <span 
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white animate-scale-in"
              >
                <span>{tag.name}</span>
                <button
                  onClick={() => removeTag(String(tag.id))}
                  className="hover:bg-white/20 rounded-full p-0.5 cursor-pointer text-white transition-colors focus:outline-none flex items-center justify-center"
                  title="移除"
                >
                  <Icon name="x" size={8} />
                </button>
              </span>
            ))}
            <button
              onClick={() => updateFilters({ tagIds: [] })}
              className="text-[10px] text-slate-400 hover:text-slate-900 font-bold ml-1 cursor-pointer transition-colors uppercase tracking-tight"
            >
              Clear
            </button>
          </div>
        )}
        
        {/* 標籤 - 默認折疊，由上方按鈕控制 */}
        {showTags && <TagGrid onClose={() => setShowTags(false)} />}
      </div>
    </div>
  );
}
