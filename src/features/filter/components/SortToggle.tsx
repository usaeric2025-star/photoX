import { useFilterState } from '../hooks/useFilterState';
import { ArrowUpDown } from 'lucide-react';

export function SortToggle() {
  const { filters, updateFilters } = useFilterState();
  const isNewest = filters.sort === 'newest';

  const handleClick = () => {
    updateFilters({ sort: isNewest ? 'oldest' : 'newest' });
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 border rounded-lg bg-white hover:bg-gray-50 transition"
      title={isNewest ? '最新' : '最舊'}
    >
      <ArrowUpDown size={18} />
    </button>
  );
}
