import React from 'react';
import { BaseFilters } from './BaseFilters';
import { FilterPanel } from './FilterPanel';
import { useUIStore } from '@/store/useUIStore';
import { CheckSquare } from 'lucide-react';

interface AdminFiltersProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  onSortChange: () => void;
  currentSort: string;
  onColumnsChange: (columns: number) => void;
  currentColumns: number;
  onToggleGroups: () => void;
  showGroupsCollapsed: boolean;
}

export function AdminFilters(props: AdminFiltersProps) {
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const update = useUIStore(s => s.update);
  
  return (
    <div className="flex flex-col bg-white border-b border-slate-200">
      <div className="flex items-center gap-2 p-3">
        <BaseFilters {...props} />
      </div>
      <FilterPanel />
    </div>
  );
};
