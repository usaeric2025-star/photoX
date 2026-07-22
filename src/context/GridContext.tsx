import { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useUI } from '#src/hooks/ui/useUI.js';
import { STORAGE_KEYS } from '#lib/storage.js';

export type ColumnCount = 2 | 3 | 4 | 6;

interface GridContextValue {
  columns: ColumnCount;
  setColumns: (value: ColumnCount) => void;
}

const GridContext = createContext<GridContextValue | null>(null);

export function GridProvider({ children }: { children: ReactNode }) {
  const { columns, setColumns: setUrlColumns } = useUI();

  const setColumns = useCallback((newColumns: number) => {
    setUrlColumns(newColumns.toString());
    localStorage.setItem(STORAGE_KEYS.PHOTO_WALL_COLUMNS, newColumns.toString());
  }, [setUrlColumns]);

  // Priority: URL > LocalStorage > Default (Mobile < 768px -> 3, Desktop -> 4)
  const effectiveColumns = useMemo(() => {
    if (columns && ['2', '3', '4', '6'].includes(columns)) {
      return Number(columns) as ColumnCount;
    }
    const stored = localStorage.getItem(STORAGE_KEYS.PHOTO_WALL_COLUMNS);
    if (stored && ['2', '3', '4', '6'].includes(stored)) {
      return Number(stored) as ColumnCount;
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return (isMobile ? 3 : 4) as ColumnCount;
  }, [columns]);

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
