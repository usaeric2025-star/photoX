import { useState } from 'react';
import { ChevronDown, ChevronUp } from '@/components/ui/Icon';
import { SearchInput } from './SearchInput';
import { SortToggle } from './SortToggle';
import { CategoryGrid } from './CategoryGrid';
import { TagGrid } from './TagGrid';
import { ColumnsToggle } from '@/features/layout/components/ColumnsToggle';
import { GroupToggle } from '@/components/ui/GroupToggle';
import { useFilters } from '@/hooks/useFilters';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  mode: 'public' | 'admin';
}

export function FilterBar({ mode }: FilterBarProps) {
  const isAdmin = mode === 'admin';
  const { showGroupsCollapsed, setShowGroupsCollapsed } = useFilters();
  const [showTags, setShowTags] = useState(false);

  return (
    <div className="flex-shrink-0 border-b bg-surface-overlay backdrop-blur-md">
      <div className="flex gap-2.5 items-center px-4 py-3 sm:px-6 max-w-full">
        <div className="flex-1 min-w-0">
          <SearchInput />
        </div>
        <div className="flex gap-2 shrink-0 items-center">
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
            <ChevronDown 
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
        
        {/* 標籤 - 默認折疊，由上方按鈕控制 */}
        {showTags && <TagGrid onClose={() => setShowTags(false)} />}
      </div>
    </div>
  );
}
