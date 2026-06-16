import { Popover } from '@base-ui/react';
import { ChevronDown, Filter } from 'lucide-react';
import { useFilterState } from '../hooks/useFilterState';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'published', label: '已發布' },
  { value: 'draft', label: '草稿' },
];

export function StatusSelect() {
  const { filters, updateFilters } = useFilterState();
  const current = STATUS_OPTIONS.find(s => s.value === filters.status) || STATUS_OPTIONS[0];

  return (
    <Popover.Root modal={false}>
      <Popover.Trigger className="flex items-center gap-1 p-2 border rounded-lg bg-white hover:bg-gray-50 transition cursor-pointer text-sm whitespace-nowrap" title={current.label}>
        <Filter size={18} />
        <ChevronDown size={14} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup className="bg-white rounded-lg shadow-xl border p-1 min-w-[120px] z-50">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => updateFilters({ status: opt.value as any })}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm cursor-pointer"
              >
                {opt.label}
              </button>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
