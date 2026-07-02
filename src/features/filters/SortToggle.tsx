import { useFilterState } from './useFilters.js';
import { Icon } from '#src/components/ui/Icon.js';

export function SortToggle() {
  const { filters, updateFilters } = useFilterState();
  const isNewest = filters.sort === 'newest';

  const handleClick = () => {
    updateFilters({ sort: isNewest ? 'oldest' : 'newest' });
  };

  return (
    <button
      onClick={handleClick}
      className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-soft text-text-main border border-border-bold hover:bg-surface-mute transition-all active:scale-95 shrink-0"
      title={isNewest ? '最新' : '最舊'}
    >
      <Icon name="arrow-up-down" size={18} />
    </button>
  );
}
