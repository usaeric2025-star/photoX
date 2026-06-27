import { useAppRoute } from '@/lib/router';
import { Router } from '@/router';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';
import { useEffect } from 'react';
import { uiStore } from '@/lib/store';
import type { ColumnCount } from '@/features/filters';

const DEFAULT_COLUMNS = 3;
const COLUMN_OPTIONS: ColumnCount[] = [2, 3, 5];

export function useColumns() {
  const route = useAppRoute();
  const params = route ? (route.params as Record<string, unknown>) : {};
  const [savedColumns, setSavedColumns] = useLocalStorage<ColumnCount>({ key: 'photo-grid-columns', defaultValue: DEFAULT_COLUMNS });
  
  const columns: ColumnCount = (() => {
    const urlColumns = params.columns;
    if (urlColumns && COLUMN_OPTIONS.includes(Number(urlColumns) as ColumnCount)) {
      return Number(urlColumns) as ColumnCount;
    }
    return savedColumns;
  })();

  // Sync to store for card subscription
  useEffect(() => {
    uiStore.getState().setGridColumns(columns);
  }, [columns]);

  const setColumns = (newColumns: ColumnCount) => {
    if (!route) return;
    setSavedColumns(newColumns);
    const currentRouteName = route.name;
    const cleanParams: Record<string, unknown> = {};
    for (const key in route.params) {
      if (key !== '~internal' && key !== 'href') {
        cleanParams[key] = (route.params as Record<string, unknown>)[key];
      }
    }

    cleanParams.columns = String(newColumns);
    Router.push(currentRouteName as never, cleanParams);
  };

  return { columns, setColumns };
}
