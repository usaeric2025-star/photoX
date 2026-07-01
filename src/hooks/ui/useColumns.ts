import { useQueryState } from 'nuqs';
import { columnsParser } from '#lib/nuqs/parsers';
import { useLocalStorage } from '../core/useLocalStorage';
import { useEffect } from 'react';
import { uiStore } from '#lib/store';
import type { ColumnCount } from '#src/features/filters';

const DEFAULT_COLUMNS = 3;
const COLUMN_OPTIONS: ColumnCount[] = [2, 3, 5];

export function useColumns() {
  const [urlColumns, setUrlColumns] = useQueryState('columns', columnsParser);
  const [savedColumns, setSavedColumns] = useLocalStorage<ColumnCount>({ 
    key: 'photo-grid-columns', 
    defaultValue: DEFAULT_COLUMNS 
  });
  
  const columns: ColumnCount = (() => {
    if (urlColumns && COLUMN_OPTIONS.includes(urlColumns as ColumnCount)) {
      return urlColumns as ColumnCount;
    }
    return savedColumns;
  })();

  // Sync to store for card subscription
  useEffect(() => {
    uiStore.getState().setGridColumns(columns);
  }, [columns]);

  const setColumns = (newColumns: ColumnCount) => {
    setSavedColumns(newColumns);
    setUrlColumns(newColumns, { shallow: true, history: 'replace' });
  };

  return { columns, setColumns };
}
