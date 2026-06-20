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
      className="p-2 border rounded-lg bg-white hover:bg-gray-50 transition"
      title={`${columns}列`}
    >
      <LayoutGrid size={18} />
    </button>
  );
}
