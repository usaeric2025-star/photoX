import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { SortToggle } from './SortToggle';
import { CategoryGrid } from './CategoryGrid';
import { TagGrid } from './TagGrid';
import { ColumnsToggle } from '@/features/layout/components/ColumnsToggle';
import { GroupToggle } from '@/components/ui/GroupToggle';
import { StatusSelect } from './StatusSelect';
import { useFilters } from '@/hooks/useFilters';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  mode: 'public' | 'admin';
}

export function FilterBar({ mode }: FilterBarProps) {
  const isAdmin = mode === 'admin';
  const { showGroupsCollapsed, setShowGroupsCollapsed } = useFilters();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn("sticky top-0 border-b", isAdmin ? "bg-amber-50" : "bg-white")}>
      <div className="flex gap-2 items-center p-4 pb-3">
        <div className="flex-1">
          <SearchInput />
        </div>
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </button>
          <SortToggle />
          <ColumnsToggle />
          <GroupToggle 
            showGroupsCollapsed={showGroupsCollapsed}
            onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
          />
          {isAdmin ? <StatusSelect /> : null}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* 分類 */}
          <CategoryGrid />
          
          {/* 標籤 */}
          <TagGrid />
        </div>
      )}
    </div>
  );
}
