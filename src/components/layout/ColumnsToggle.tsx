import { useColumns } from '@/hooks';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export function ColumnsToggle() {
  const { columns, setColumns } = useColumns();

  const handleToggle = () => {
    const nextCols: 2 | 3 | 5 = columns === 3 ? 5 : columns === 5 ? 2 : 3;
    setColumns(nextCols);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "relative h-10 w-10 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-90 border bg-surface-soft text-text-main border-border-soft hover:bg-surface-mute"
      )}
      title={`切換欄數 (當前: ${columns})`}
    >
      <Icon name="layout-grid" size={18} />
      <span className="sr-only">切換欄數</span>
    </button>
  );
}
