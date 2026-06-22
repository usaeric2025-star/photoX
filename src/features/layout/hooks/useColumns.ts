import { Router, useAppRoute } from '@/router';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';
import type { ColumnCount } from '@/features/filter/types';

const DEFAULT_COLUMNS = 3;
const COLUMN_OPTIONS: ColumnCount[] = [2, 3, 5];

export function useColumns() {
  const route = useAppRoute();
  const params = route ? (route.params as any) : {};
  const [savedColumns, setSavedColumns] = useLocalStorage<ColumnCount>({ key: 'photo-grid-columns', defaultValue: DEFAULT_COLUMNS });
  
  const columns: ColumnCount = (() => {
    const urlColumns = params.columns;
    if (urlColumns && COLUMN_OPTIONS.includes(Number(urlColumns) as ColumnCount)) {
      return Number(urlColumns) as ColumnCount;
    }
    return savedColumns;
  })();

  const setColumns = (newColumns: ColumnCount) => {
    if (!route) return;
    setSavedColumns(newColumns);
    const currentRouteName = route.name;
    const cleanParams: Record<string, any> = {};
    for (const key in route.params) {
      if (key !== '~internal' && key !== 'href') {
        cleanParams[key] = (route.params as Record<string, unknown>)[key];
      }
    }

    cleanParams.columns = String(newColumns);
    Router.push(currentRouteName as any, cleanParams);
  };

  return { columns, setColumns };
}
