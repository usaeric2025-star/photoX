import { useTransition, useState, useEffect } from 'react';
import { useFilterState } from './useFilterState';
import { Search } from 'lucide-react';
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

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        id="global-search-input"
        value={inputValue}
        onChange={handleChange}
        placeholder={t.searchPlaceholder || "搜尋照片..."}
        className="w-full pl-9 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
