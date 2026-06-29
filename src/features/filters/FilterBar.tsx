import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SearchInput } from './SearchInput';
import { SortToggle } from './SortToggle';
import { CategoryGrid } from './CategoryGrid';
import { TagGrid } from './TagGrid';
import { ColumnsToggle } from '@/components/layout/ColumnsToggle';
import { GroupToggle } from '@/components/ui/GroupToggle';
import { useFilters, useFilterState } from './useFilters';
import { useTags } from '@/hooks/tag';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  mode: 'public' | 'admin';
  className?: string;
}

export function FilterBar({ mode, className }: FilterBarProps) {
  const isAdmin = mode === 'admin';
  const { showGroupsCollapsed, setShowGroupsCollapsed } = useFilters();
  const [showTags, setShowTags] = useState(false);
  const { filters, updateFilters } = useFilterState();
  const { tags: allTags } = useTags();

  const selectedTags = allTags?.filter(tag => filters.tagIds.includes(String(tag.id))) || [];

  const removeTag = (tagId: string) => {
    updateFilters({
      tagIds: filters.tagIds.filter(id => id !== tagId)
    });
  };

  return (
    <div className={cn("flex-shrink-0 border-b bg-surface-overlay backdrop-blur-md", className)}>
      <div className="flex flex-row gap-2.5 items-center px-4 py-3 sm:px-6 max-w-full">
        <div className="flex-1 min-w-0">
          <SearchInput />
        </div>
        <div className="flex gap-2 shrink-0 items-center overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
          <button 
            onClick={() => setShowTags(!showTags)}
            className={cn(
              "h-10 px-3 sm:px-4 rounded-full transition-all flex items-center gap-2 cursor-pointer active:scale-95 border",
              showTags 
                ? "bg-primary text-text-on-primary border-primary shadow-md" 
                : "bg-surface-soft text-text-main border-border-soft hover:bg-surface-mute"
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
      
      <div className="px-4 pb-3 space-y-2">
        {/* 分類 - 根據規範固定渲染 2 x 4 */}
        <CategoryGrid mode={mode} />

        {/* 已選標籤顯示與移除 */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center pt-1.5 pb-0.5 px-1 animate-fade-in">
            <span className="text-[11px] font-bold text-text-sub uppercase tracking-wider mr-1">已選標籤:</span>
            {selectedTags.map(tag => (
              <span 
                key={tag.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 animate-scale-in"
              >
                <span>{tag.name}</span>
                <button
                  onClick={() => removeTag(String(tag.id))}
                  className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer text-primary transition-colors focus:outline-none flex items-center justify-center"
                  title="移除"
                >
                  <Icon name="x" size={10} />
                </button>
              </span>
            ))}
            <button
              onClick={() => updateFilters({ tagIds: [] })}
              className="text-[11px] text-text-sub hover:text-danger font-semibold ml-1 cursor-pointer transition-colors"
            >
              清除全部
            </button>
          </div>
        )}
        
        {/* 標籤 - 默認折疊，由上方按鈕控制 */}
        {showTags && <TagGrid onClose={() => setShowTags(false)} />}
      </div>
    </div>
  );
}
