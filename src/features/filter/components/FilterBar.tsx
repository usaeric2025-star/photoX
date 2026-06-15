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

  return (
    <div className={cn("sticky top-0 border-b", isAdmin ? "bg-amber-50" : "bg-white")}>
      {/* 第一行：搜索 + 右側按鈕 */}
      <div className="flex gap-2 items-center p-4 pb-3">
        <div className="flex-1">
          <SearchInput />
        </div>
        <div className="flex gap-1 shrink-0">
          <SortToggle />
          <ColumnsToggle />
          <GroupToggle 
            showGroupsCollapsed={showGroupsCollapsed}
            onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
          />
          {isAdmin ? <StatusSelect /> : null}
        </div>
      </div>
      
      {/* 第二行：分類 */}
      <CategoryGrid />
      
      {/* 第三行：標籤 */}
      <TagGrid />
    </div>
  );
}
