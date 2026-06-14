import React from 'react';
import { useFilters } from '@/hooks/useFilters';
import { BaseFilters } from '@/components/ui/BaseFilters';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { useColumns } from '@/store/useUIStore';
import { useUrlFilters } from '@/hooks';

interface FiltersBarProps {
  filters: ReturnType<typeof useFilters>;
  showStatus?: boolean;
  showBatch?: boolean;
}

export const FiltersBar = ({ filters, showStatus, showBatch }: FiltersBarProps) => {
  const { 
    search, setSearch, 
    sort, setSort, 
    showGroupsCollapsed, setShowGroupsCollapsed 
  } = filters;
  const [columns, setColumns] = useColumns();

  const handleSortChange = () => {
    setSort(sort === 'newest' ? 'oldest' : 'newest');
  };

  return (
    <div className="flex flex-col bg-white border-b border-slate-200 w-full shrink-0">
      <div className="flex items-center gap-2 p-3">
        <BaseFilters
          onSearch={setSearch}
          searchQuery={search}
          onSortChange={handleSortChange}
          currentSort={sort || 'newest'}
          onColumnsChange={(cols) => setColumns(cols as any)}
          currentColumns={columns}
          onToggleGroups={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
          showGroupsCollapsed={showGroupsCollapsed}
        />
      </div>
      <FilterPanel />
    </div>
  );
};
