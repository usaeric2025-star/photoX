import { useTransition, useState, useEffect } from 'react';
import { useFilterState } from './useFilterState';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner';
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
    <div className="relative group">
      <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute transition-colors group-focus-within:text-primary" />
      <input
        type="text"
        id="global-search-input"
        value={inputValue}
        onChange={handleChange}
        placeholder={t.searchPlaceholder || "正在搜索..."}
        className="w-full pl-10 pr-10 h-10 bg-surface-soft border-none rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm placeholder:text-text-mute"
      />
      {inputValue && (
        <button 
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-mute hover:bg-surface-mute transition-colors active:scale-95"
        >
          <Icon name="x" size={18} />
        </button>
      )}
      {!inputValue && isPending && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          <LoadingSpinner size="xs" />
        </div>
      )}
    </div>
  );
}
