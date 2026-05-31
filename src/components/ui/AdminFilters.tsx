import React from 'react';
import { Upload, Settings, Trash2, CheckSquare } from 'lucide-react';
import { BaseFilters } from './BaseFilters';
import { FilterPanel } from './FilterPanel';

interface AdminFiltersProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  onSortChange: () => void;
  currentSort: string;
  onColumnsChange: (columns: number) => void;
  currentColumns: number;
  onToggleGroups: () => void;
  showGroupsCollapsed: boolean;
  onUpload?: () => void;
  onSettings?: () => void;
  onBatchDelete?: () => void;
  onMultiSelect?: () => void;
  isMultiSelect?: boolean;
  selectedCount?: number;
}

export const AdminFilters: React.FC<AdminFiltersProps> = ({
  onUpload,
  onSettings,
  onBatchDelete,
  onMultiSelect,
  isMultiSelect,
  selectedCount = 0,
  ...baseProps
}) => {
  return (
    <div className="flex flex-col bg-white border-b border-slate-200">
      <div className="flex items-center gap-2 p-3">
        <BaseFilters {...baseProps} />
        
        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
          {onUpload && (
            <button
              onClick={onUpload}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="上传"
            >
              <Upload size={18} className="text-slate-600" />
            </button>
          )}
          
          {onMultiSelect && (
            <button
              onClick={onMultiSelect}
              className={`p-2 rounded-lg transition-colors ${isMultiSelect ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'}`}
              title="多选"
            >
              <CheckSquare size={18} />
            </button>
          )}
          
          {isMultiSelect && selectedCount > 0 && onBatchDelete && (
            <button
              onClick={onBatchDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
              title={`删除 ${selectedCount} 项`}
            >
              <Trash2 size={18} />
            </button>
          )}
          
          {onSettings && (
            <button
              onClick={onSettings}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="设置"
            >
              <Settings size={18} className="text-slate-600" />
            </button>
          )}
        </div>
      </div>
      <FilterPanel />
    </div>
  );
};
