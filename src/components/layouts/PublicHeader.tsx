import { useState } from 'react';
import { Search, Grid3x3, Grid2x2, LayoutGrid, ArrowUpDown, Layers } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

interface PublicHeaderProps {
  totalCount?: number;
  onSearch?: (query: string) => void;
  onSortChange?: () => void;
  onColumnsChange?: (columns: number) => void;
  onToggleGroups?: () => void;
  currentColumns?: number;
  showGroupsCollapsed?: boolean;
  currentSort?: string;
}

export function PublicHeader({
  totalCount,
  onSearch,
  onSortChange,
  onColumnsChange,
  onToggleGroups,
  currentColumns = 3,
  showGroupsCollapsed = false,
  currentSort = 'newest',
}: PublicHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">
            PHOT<span className="text-blue-600">O</span>X
          </h1>
          {totalCount !== undefined && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </div>

        {/* 搜索和筛选 */}
        <div className="flex items-center gap-2">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索产品..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>

          {/* 排序 */}
          <button
            onClick={onSortChange}
            className="p-1.5 rounded-lg hover:bg-slate-100"
            title={currentSort === 'newest' ? '最新优先' : '最早优先'}
          >
            <ArrowUpDown size={16} />
          </button>

          {/* 列数切换 */}
          <div className="flex gap-0.5 border border-slate-200 rounded-lg p-0.5">
            {[2, 3, 4].map(cols => (
              <button
                key={cols}
                onClick={() => onColumnsChange?.(cols)}
                className={`p-1 rounded ${currentColumns === cols ? 'bg-blue-500 text-white' : 'text-slate-500'}`}
              >
                {cols === 2 && <Grid2x2 size={14} />}
                {cols === 3 && <Grid3x3 size={14} />}
                {cols === 4 && <LayoutGrid size={14} />}
              </button>
            ))}
          </div>

          {/* 合组折叠 */}
          <button
            onClick={onToggleGroups}
            className={`p-1.5 rounded-lg ${showGroupsCollapsed ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'}`}
          >
            <Layers size={16} />
          </button>

          {/* 语言切换 */}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
