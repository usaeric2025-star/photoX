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
    const cleanParams: Record<string, any> = {};
    for (const key in route.params) {
      if (key !== '~internal' && key !== 'href') {
        cleanParams[key] = (route.params as any)[key];
      }
    }

    if (currentRouteName && routes[currentRouteName]) {
      const nextRoute = (routes[currentRouteName] as any)({
        ...cleanParams,
        columns: newColumns
      });
      if (nextRoute && typeof nextRoute.push === 'function') {
        nextRoute.push();
      }
    }
  };

  return { columns, setColumns };
}
