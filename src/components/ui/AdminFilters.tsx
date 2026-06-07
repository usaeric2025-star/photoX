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
        
        <button
          onClick={() => update({ isMultiSelect: !isMultiSelect })}
          className={`h-[34px] w-[34px] flex items-center justify-center rounded-full transition-colors border ${isMultiSelect ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200/80 shadow-sm'}`}
          title="选择模式"
        >
          <CheckSquare size={16} />
        </button>
      </div>
      <FilterPanel />
    </div>
  );
};
