import { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useQueryState, parseAsInteger } from 'nuqs';
import { QUERY_PARAMS } from '#lib/nuqs/constants.js';
import { STORAGE_KEYS } from '#lib/storage.js';

export type ColumnCount = 2 | 3 | 6;

interface GridContextValue {
  columns: ColumnCount;
  setColumns: (value: ColumnCount) => void;
}

const GridContext = createContext<GridContextValue | null>(null);

export function GridProvider({ children }: { children: ReactNode }) {
  // Use 'cols' to match existing URL patterns
  const [columns, setUrlColumns] = useQueryState(QUERY_PARAMS.COLS, parseAsInteger.withDefault(3));

  const setColumns = useCallback((newColumns: number) => {
    setUrlColumns(newColumns as ColumnCount, { shallow: true, history: 'replace' });
    localStorage.setItem(STORAGE_KEYS.PHOTO_WALL_COLUMNS, newColumns.toString());
  }, [setUrlColumns]);

  // Priority: URL > LocalStorage > Default (3)
  const effectiveColumns = (columns || Number(localStorage.getItem(STORAGE_KEYS.PHOTO_WALL_COLUMNS)) || 3) as ColumnCount;

  const value = useMemo(() => ({ 
    columns: effectiveColumns, 
    setColumns 
  }), [effectiveColumns, setColumns]);

  return (
    <GridContext.Provider value={value}>
      {children}
    </GridContext.Provider>
  );
}

export function useGrid() {
  const context = useContext(GridContext);
  if (!context) {
    throw new Error('useGrid must be used within GridProvider');
  }
  return context;
}
