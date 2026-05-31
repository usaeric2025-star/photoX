import React from 'react';
import { Upload, Settings, Trash2, CheckSquare } from 'lucide-react';
import { BaseFilters } from './BaseFilters';
import { FilterPanel } from './FilterPanel';

import { useGalleryStore } from '@/store/galleryStore';
import { translations } from '@/lib/translations';

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

export function AdminFilters({
  onUpload,
  onSettings,
  onBatchDelete,
  onMultiSelect,
  isMultiSelect,
  selectedCount = 0,
  ...baseProps
}: AdminFiltersProps) {
  const appLang = useGalleryStore(s => s.appLang);
  const t = (translations as any)[appLang];

  return (
    <div className="flex flex-col bg-white border-b border-slate-200">
      <div className="flex items-center gap-2 p-3">
        <BaseFilters {...baseProps} />
        
        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
          {onUpload && (
            <button
              onClick={onUpload}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title={t.upload}
            >
              <Upload size={18} className="text-slate-600" />
            </button>
          )}
          
          {onMultiSelect && (
            <button
              onClick={onMultiSelect}
              className={`p-2 rounded-lg transition-colors ${isMultiSelect ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'}`}
              title={t.multiSelect}
            >
              <CheckSquare size={18} />
            </button>
          )}
          
          {isMultiSelect && selectedCount > 0 && onBatchDelete && (
            <button
              onClick={onBatchDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
              title={t.deleteSelected(selectedCount)}
            >
              <Trash2 size={18} />
            </button>
          )}
          
          {onSettings && (
            <button
              onClick={onSettings}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title={t.settings}
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
