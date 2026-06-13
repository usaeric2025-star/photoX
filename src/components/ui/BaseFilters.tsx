import React from 'react';
import { ArrowUpDown, Layers, Grid2x2, Grid3x3, LayoutGrid, ShieldAlert } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { useUIStore, useAppLang } from '@/store/useUIStore';
import { translations } from '@/locales';

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

export function BaseFilters({
  onSearch,
  searchQuery,
  onSortChange,
  currentSort,
  onColumnsChange,
  currentColumns,
  onToggleGroups,
  showGroupsCollapsed,
}: BaseFiltersProps) {
  const [appLang] = useAppLang();
  const t = (translations as any)[appLang] || translations.en;

  const toggleColumns = () => {
    const nextCols = currentColumns === 2 ? 3 : currentColumns === 3 ? 5 : 2;
    onColumnsChange(nextCols);
  };

  return (
    <>
      <div className="flex-1">
        <SearchInput
          onSearch={onSearch}
          value={searchQuery}
          placeholder={t.searchPlaceholder}
          clearLabel={t.clear}
          className="w-full"
        />
      </div>

      <button
        onClick={onSortChange}
        className="h-10 sm:h-[34px] w-10 sm:w-[34px] flex items-center justify-center rounded-full hover:bg-slate-100 border border-slate-200/80 transition-colors"
        title={`排序: ${currentSort === 'newest' ? '最新优先' : '最早优先'}`}
      >
        <ArrowUpDown size={15} className="text-slate-600" />
      </button>

      <button
        onClick={toggleColumns}
        className="h-10 sm:h-[34px] w-10 sm:w-[34px] flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors border border-slate-200/80 bg-white"
        title={`列数切换: 当前 ${currentColumns} 列`}
      >
        {currentColumns === 2 && <Grid2x2 size={15} className="text-slate-600" />}
        {currentColumns === 3 && <Grid3x3 size={15} className="text-slate-600" />}
        {currentColumns === 5 && <LayoutGrid size={15} className="text-brand-navy stroke-[2.5]" />}
      </button>

      <button
        onClick={onToggleGroups}
        className={`h-10 sm:h-[34px] w-10 sm:w-[34px] flex items-center justify-center rounded-full transition-all duration-200 border border-slate-200/80 ${showGroupsCollapsed ? 'bg-brand-navy text-white border-brand-navy shadow-md shadow-brand-navy/15' : 'hover:bg-slate-100 text-slate-600 bg-white'}`}
        title={showGroupsCollapsed ? '展开合组' : '折叠合组'}
      >
        <Layers size={15} className={showGroupsCollapsed ? 'stroke-[2.5]' : ''} />
      </button>
    </>
  );
};
