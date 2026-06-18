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
import { toast } from 'sonner';

interface FilterBarProps {
  mode: 'public' | 'admin';
}

export function FilterBar({ mode }: FilterBarProps) {
  const isAdmin = mode === 'admin';
  const { showGroupsCollapsed, setShowGroupsCollapsed } = useFilters();
  const [isExpanded, setIsExpanded] = useState(!isAdmin); // Public always expanded by default

  return (
    <div className="flex-shrink-0 border-b bg-white">
      <div className="flex gap-2 items-center p-4 pb-3">
        <div className="flex-1">
          <SearchInput />
        </div>
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 border rounded-lg bg-white hover:bg-gray-50 border-gray-200 transition"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </button>
          <SortToggle />
          <ColumnsToggle />
          <GroupToggle 
            showGroupsCollapsed={showGroupsCollapsed}
            onClick={() => {
              setShowGroupsCollapsed(!showGroupsCollapsed);
            }}
          />
          {isAdmin ? <StatusSelect /> : null}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* 分類 - 根據規範固定渲染 2 x 4 */}
          <CategoryGrid mode={mode} />
          
          {/* 標籤 */}
          {isAdmin && <TagGrid />}
        </div>
      )}
    </div>
  );
}
