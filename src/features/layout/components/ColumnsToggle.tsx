import { useColumns } from '../hooks/useColumns';
import { LayoutGrid } from '@/components/ui/Icon';

const COLUMN_OPTIONS = [2, 3, 5] as const;

export function ColumnsToggle() {
  const { columns, setColumns } = useColumns();

  const cycleColumns = () => {
    const nextIndex = (COLUMN_OPTIONS.indexOf(columns) + 1) % COLUMN_OPTIONS.length;
    setColumns(COLUMN_OPTIONS[nextIndex]);
  };

  return (
    <button
      onClick={cycleColumns}
      className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-soft text-text-main border border-border-bold hover:bg-surface-mute transition-all active:scale-95 shrink-0"
      title={`${columns}列`}
    >
      <LayoutGrid size={18} />
    </button>
  );
}
