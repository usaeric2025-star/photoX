import { useRoute, routes } from '@/router';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';
import type { ColumnCount } from '@/features/filter/types';

const DEFAULT_COLUMNS = 3;
const COLUMN_OPTIONS: ColumnCount[] = [2, 3, 5];

export function useColumns() {
  const route = useRoute();
  const params = route.params as any;
  const [savedColumns, setSavedColumns] = useLocalStorage<ColumnCount>({ key: 'photo-grid-columns', defaultValue: DEFAULT_COLUMNS });
  
  const columns: ColumnCount = (() => {
    const urlColumns = params.columns;
    if (urlColumns && COLUMN_OPTIONS.includes(Number(urlColumns) as ColumnCount)) {
      return Number(urlColumns) as ColumnCount;
    }
    return savedColumns;
  })();

  const setColumns = (newColumns: ColumnCount) => {
    setSavedColumns(newColumns);
    const currentRouteName = route.name;
    const currentParams = route.params;

    if (currentRouteName && routes[currentRouteName]) {
      (routes[currentRouteName] as any)({
        ...currentParams,
        columns: newColumns
      }).push();
    }
  };

  return { columns, setColumns };
}
