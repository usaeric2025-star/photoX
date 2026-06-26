import { uiStore, useUIStore } from '@/store/uiStore';
import { useFilterState } from './useFilterState';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks';
import { useDebouncedCallback } from '@/hooks/core/useDebouncedCallback';

export function SearchInput() {
  const { updateFilters } = useFilterState();
  const searchTerm = useUIStore(s => s.filters.q);
  const patch = useUIStore(s => s.patch);
  const { uiTranslations: t } = useTranslation();

  const debouncedUpdateFilters = useDebouncedCallback((value: string) => {
    updateFilters({ search: value });
  }, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    patch(s => ({ filters: { ...s.filters, q: value } }));
    debouncedUpdateFilters(value);
  };

  const handleClear = () => {
    patch(s => ({ filters: { ...s.filters, q: '' } }));
    debouncedUpdateFilters("");
  };

  return (
    <div className="relative group">
      <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute transition-colors group-focus-within:text-primary" />
      <input
        type="text"
        id="global-search-input"
        value={searchTerm}
        onChange={handleChange}
        placeholder={t.searchPlaceholder || "正在搜索..."}
        className="w-full pl-10 pr-10 h-10 bg-surface-soft border-none rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm placeholder:text-text-mute"
      />
      {!!searchTerm && (
        <button 
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-mute hover:bg-surface-mute transition-colors active:scale-95"
        >
          <Icon name="x" size={18} />
        </button>
      )}
    </div>
  );
}
