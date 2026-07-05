import { useTranslation } from '#src/hooks/index.js';
import { useGrid, ColumnCount } from '#src/context/GridContext.js';
import { Icon } from '#src/components/ui/Icon.js';
import { cn } from '#lib/utils.js';

export function ColumnsToggle() {
  const { columns, setColumns } = useGrid();
  const { t } = useTranslation();

  const handleToggle = () => {
    // Standard sequence: 3 -> 6 -> 2 -> 3
    const nextCols: ColumnCount = 
      columns === 3 ? 6 : 
      columns === 6 ? 2 : 3;
    setColumns(nextCols);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "relative h-10 w-10 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-90 border bg-surface-soft text-text-main border-border-soft hover:bg-surface-mute"
      )}
      title={`${t('toggleColumns')} (${t('currentCols')}${columns})`}
    >
      <Icon name="layout-grid" size={18} />
      <span className="sr-only">{t('toggleColumns')}</span>
    </button>
  );
}
