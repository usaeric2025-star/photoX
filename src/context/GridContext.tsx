import { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useUI } from '#src/hooks/ui/useUI.js';
import { STORAGE_KEYS } from '#lib/storage.js';

export type ColumnCount = 2 | 3 | 6;

interface GridContextValue {
  columns: ColumnCount;
  setColumns: (value: ColumnCount) => void;
}

const GridContext = createContext<GridContextValue | null>(null);

export function GridProvider({ children }: { children: ReactNode }) {
  const { columns, setColumns: setUrlColumns } = useUI();

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
