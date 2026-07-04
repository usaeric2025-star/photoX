import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useQueryState, parseAsInteger } from 'nuqs';

export type ColumnCount = 2 | 3 | 6;

interface GridContextValue {
  columns: ColumnCount;
  setColumns: (value: ColumnCount) => void;
}

const GridContext = createContext<GridContextValue | null>(null);

export function GridProvider({ children }: { children: ReactNode }) {
  // Use 'cols' to match existing URL patterns
  const [columns, setUrlColumns] = useQueryState('cols', parseAsInteger.withDefault(3));

  const setColumns = useCallback((newColumns: number) => {
    setUrlColumns(newColumns as ColumnCount, { shallow: true, history: 'replace' });
    localStorage.setItem('photo-wall-columns', newColumns.toString());
  }, [setUrlColumns]);

  // Priority: URL > LocalStorage > Default (3)
  const effectiveColumns = (columns || Number(localStorage.getItem('photo-wall-columns')) || 3) as ColumnCount;

  return (
    <GridContext.Provider value={{ columns: effectiveColumns, setColumns }}>
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
