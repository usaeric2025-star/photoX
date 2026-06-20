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
    <div className="flex-shrink-0 border-b bg-white">
      <div className="flex gap-2 items-center p-4 pb-3">
        <div className="flex-1">
          <SearchInput />
        </div>
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => setShowTags(!showTags)}
            className={cn(
              "px-3 py-2 border rounded-lg transition flex items-center gap-1 cursor-pointer",
              showTags 
                ? "bg-slate-950 border-slate-950 text-white" 
                : "bg-white hover:bg-gray-50 border-gray-200 text-gray-500"
            )}
            title={showTags ? '收起標籤' : '展開標籤'}
          >
            <span className="text-[11px] font-black tracking-wider font-sans uppercase">TAGS</span>
            {showTags ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
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
      
      <div className="px-4 pb-3 space-y-2">
        {/* 分類 - 根據規範固定渲染 2 x 4 */}
        <CategoryGrid mode={mode} />
        
        {/* 標籤 - 默認折疊，由上方按鈕控制 */}
        {showTags && <TagGrid onClose={() => setShowTags(false)} />}
      </div>
    </div>
  );
}
