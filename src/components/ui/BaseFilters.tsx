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
    const nextCols = currentColumns === 2 ? 3 : currentColumns === 3 ? 4 : currentColumns === 4 ? 5 : 2;
    onColumnsChange(nextCols);
  };

  return (
    <>
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="搜索产品..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-8 pr-3 h-[34px] text-[12px] border border-slate-200 bg-slate-50/50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
        />
      </div>

      <button
        onClick={onSortChange}
        className="h-[34px] w-[34px] flex items-center justify-center rounded-full hover:bg-slate-100 border border-slate-200/80 transition-colors"
        title={`排序: ${currentSort === 'newest' ? '最新优先' : '最早优先'}`}
      >
        <ArrowUpDown size={15} className="text-slate-600" />
      </button>

      <button
        onClick={toggleColumns}
        className="h-[34px] w-[34px] flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors border border-slate-200/80"
        title={`列数切换: 当前 ${currentColumns} 列`}
      >
        {currentColumns === 2 && <Grid2x2 size={15} className="text-slate-600" />}
        {currentColumns === 3 && <Grid3x3 size={15} className="text-slate-600" />}
        {currentColumns === 4 && <LayoutGrid size={15} className="text-slate-600" />}
        {currentColumns === 5 && <LayoutGrid size={15} className="text-blue-600" />}
      </button>

      <button
        onClick={onToggleGroups}
        className={`h-[34px] w-[34px] flex items-center justify-center rounded-full transition-colors border border-slate-200/80 ${showGroupsCollapsed ? 'bg-blue-500 text-white border-blue-500' : 'hover:bg-slate-100 text-slate-600'}`}
        title={showGroupsCollapsed ? '展开合组' : '折叠合组'}
      >
        <Layers size={15} />
      </button>
    </>
  );
};
