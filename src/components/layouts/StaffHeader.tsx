import { useState } from 'react';
import { Search, Grid3x3, Grid2x2, Grid4x4, ArrowUpDown, Layers, Upload, User } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks';

interface StaffHeaderProps {
  totalCount?: number;
  onSearch?: (query: string) => void;
  onSortChange?: () => void;
  onColumnsChange?: (columns: number) => void;
  onToggleGroups?: () => void;
  onUpload?: () => void;
  currentColumns?: number;
  showGroupsCollapsed?: boolean;
  currentSort?: string;
}

export function StaffHeader({
  totalCount,
  onSearch,
  onSortChange,
  onColumnsChange,
  onToggleGroups,
  onUpload,
  currentColumns = 3,
  showGroupsCollapsed = false,
  currentSort = 'newest',
}: StaffHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();

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

        {/* 员工工具 */}
        <div className="flex items-center gap-2">
          {/* 上传按钮 */}
          {onUpload && (
            <button
              onClick={onUpload}
              className="p-1.5 rounded-lg hover:bg-slate-100"
              title="上传"
            >
              <Upload size={16} />
            </button>
          )}

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
                {cols === 4 && <Grid4x4 size={14} />}
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

          {/* 用户菜单 */}
          <div className="relative group">
            <button className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100">
              <User size={16} />
              <span className="text-sm max-w-[100px] truncate">
                {user?.display_name || user?.email}
              </span>
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => logout()}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50 rounded-lg"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
