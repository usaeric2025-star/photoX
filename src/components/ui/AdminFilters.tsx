import React from 'react';
import { Upload, Settings, Trash2, CheckSquare, Brain, LayoutGrid, Globe, MoreVertical, LayoutDashboard } from 'lucide-react';
import { BaseFilters } from './BaseFilters';
import { FilterPanel } from './FilterPanel';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
  onBatchAiIdentify?: () => void;
  onMultiSelect?: () => void;
  isMultiSelect?: boolean;
  selectedCount?: number;
  onModeToggle?: () => void; // 添加模式切换回调
}

export function AdminFilters({
  onUpload,
  onSettings,
  onBatchDelete,
  onBatchAiIdentify,
  onMultiSelect,
  isMultiSelect,
  selectedCount = 0,
  onModeToggle,
  ...baseProps
}: AdminFiltersProps) {
  const appLang = useGalleryStore(s => s.appLang);
  const setAppLang = useGalleryStore(s => s.setAppLang);
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
                title={t.upload || '上传'}
            >
              <Upload size={18} className="text-slate-600" />
            </button>
          )}

          {onBatchAiIdentify && (
            <button
              onClick={onBatchAiIdentify}
              className="p-2 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
                title={t.aiIdentify || 'AI 识别'}
            >
              <Brain size={18} />
            </button>
          )}
          
          {onMultiSelect && (
            <button
              onClick={onMultiSelect}
              className={`p-2 rounded-lg transition-colors ${isMultiSelect ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'}`}
                title={t.multiSelect || '多选'}
            >
              <CheckSquare size={18} />
            </button>
          )}
          
          {isMultiSelect && selectedCount > 0 && onBatchDelete && (
            <button
              onClick={onBatchDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                title={t.deleteSelected ? t.deleteSelected(selectedCount) : '删除选中'}
            >
              <Trash2 size={18} />
            </button>
          )}
          
          {/* 菜单 Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <MoreVertical size={18} className="text-slate-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setAppLang(appLang === 'en' ? 'zh' : 'en')}>
                <Globe size={16} className="mr-2" />
                {appLang === 'en' ? '切换为中文' : 'Switch to English'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onModeToggle && (
                <DropdownMenuItem onClick={onModeToggle}>
                  <LayoutGrid size={16} className="mr-2" />
                  切换模式 (当前: 管理)
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => window.location.href = '/admin'}>
                <LayoutDashboard size={16} className="mr-2" />
                进入后台
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onSettings && (
            <button
              onClick={onSettings}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title={t.settings || '设置'}
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
