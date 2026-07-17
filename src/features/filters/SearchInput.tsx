import React, { useState, useEffect } from 'react';
import { useFilters } from '#src/hooks/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useTranslation } from '#src/hooks/index.js';
import { useDebouncedCallback } from '#src/hooks/core/index.js';

/**
 * SearchInput
 * 
 * 頂部全局搜索輸入框，支持防抖處理。
 */
export function SearchInput() {
  const { search, setSearch } = useFilters();
  const [searchTerm, setSearchTerm] = useState(search || '');
  const { t } = useTranslation();
 
  // 同步外部變更（如重置過濾器）
  useEffect(() => {
    if (search !== searchTerm) {
      setSearchTerm(search || '');
    }
  }, [search]);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearch(value || null);
  }, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSetSearch(value);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSearch(null);
  };

  return (
    <div className="relative group">
      <Icon 
        name="search" 
        size={18} 
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" 
      />
      <input
        type="text"
        id="global-search-input"
        value={searchTerm}
        onChange={handleChange}
        placeholder={t('searchPlaceholder') || "正在搜索..."}
        className="w-full pl-10 pr-10 h-10 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 transition-all text-sm placeholder:text-slate-400"
      />
      {!!searchTerm && (
        <button 
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:bg-slate-200 transition-colors active:scale-95"
        >
          <Icon name="x" size={18} />
        </button>
      )}
    </div>
  );
}
