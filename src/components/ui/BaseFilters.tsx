import React from 'react';
import { Search, ArrowUpDown, Layers, Grid2x2, Grid3x3, LayoutGrid } from 'lucide-react';

interface BaseFiltersProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  onSortChange: () => void;
  currentSort: string;
  onColumnsChange: (columns: number) => void;
  currentColumns: number;
  onToggleGroups: () => void;
  showGroupsCollapsed: boolean;
}

export const BaseFilters: React.FC<BaseFiltersProps> = ({
  onSearch,
  searchQuery,
  onSortChange,
  currentSort,
  onColumnsChange,
  currentColumns,
  onToggleGroups,
  showGroupsCollapsed,
}) => {
  const toggleColumns = () => {
    const nextCols = currentColumns === 2 ? 3 : currentColumns === 3 ? 5 : 2;
    onColumnsChange(nextCols);
  };

  return (
    <>
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="搜索产品..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={onSortChange}
        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        title={`排序: ${currentSort === 'newest' ? '最新优先' : '最早优先'}`}
      >
        <ArrowUpDown size={18} className="text-slate-600" />
      </button>

      <button
        onClick={toggleColumns}
        className="p-2 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
        title={`列数切换: 当前 ${currentColumns} 列`}
      >
        {currentColumns === 2 && <Grid2x2 size={18} className="text-slate-600" />}
        {currentColumns === 3 && <Grid3x3 size={18} className="text-slate-600" />}
        {currentColumns === 5 && <LayoutGrid size={18} className="text-slate-600" />}
      </button>

      <button
        onClick={onToggleGroups}
        className={`p-2 rounded-lg transition-colors ${showGroupsCollapsed ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'}`}
        title={showGroupsCollapsed ? '展开合组' : '折叠合组'}
      >
        <Layers size={18} />
      </button>
    </>
  );
};
