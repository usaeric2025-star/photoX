import { useSearch } from '@tanstack/react-router';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';
import type { ColumnCount } from '@/features/filter/types';
import { useNavigate } from '@tanstack/react-router';

const DEFAULT_COLUMNS = 3;
const COLUMN_OPTIONS: ColumnCount[] = [2, 3, 5];

export function useColumns() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const [savedColumns, setSavedColumns] = useLocalStorage<ColumnCount>({ key: 'photo-grid-columns', defaultValue: DEFAULT_COLUMNS });
  
  const columns: ColumnCount = (() => {
    const urlColumns = search.columns;
    if (urlColumns && COLUMN_OPTIONS.includes(Number(urlColumns) as ColumnCount)) {
      return Number(urlColumns) as ColumnCount;
    }
    return savedColumns;
  })();

  const setColumns = (newColumns: ColumnCount) => {
    setSavedColumns(newColumns);
    navigate({
      search: ((prev: Record<string, unknown>) => ({
        ...prev,
        columns: String(newColumns)
      })) as any
    });
  };

  return { columns, setColumns };
}
