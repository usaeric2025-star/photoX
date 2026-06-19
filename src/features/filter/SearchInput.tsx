import { useTransition, useState, useEffect } from 'react';
import { useFilterState } from './useFilterState';
import { Search, X } from 'lucide-react';
import { useTranslation } from '@/hooks';

export function SearchInput() {
  const { filters, updateFilters } = useFilterState();
  const [inputValue, setInputValue] = useState(filters.search);
  const [isPending, startTransition] = useTransition();
  const { uiTranslations: t } = useTranslation();

  useEffect(() => {
    setInputValue(filters.search);
  }, [filters.search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    startTransition(() => {
      updateFilters({ search: value });
    });
  };

  const handleClear = () => {
    setInputValue("");
    startTransition(() => {
      updateFilters({ search: "" });
    });
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        id="global-search-input"
        value={inputValue}
        onChange={handleChange}
        placeholder={t.searchPlaceholder || "搜尋照片..."}
        className="w-full pl-9 pr-9 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {inputValue && (
        <button 
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}
      {!inputValue && isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
