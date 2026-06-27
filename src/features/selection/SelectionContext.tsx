import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useSelectionLogic } from './useSelectionLogic';

interface SelectionState {
  selectedIds: string[];
  mode: 'single' | 'batch';
  isSelecting: boolean;
}

interface SelectionContextValue {
  state: SelectionState;
  select: (id: string) => void;
  unselect: (id: string) => void;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  toggleMode: () => void;
  isSelected: (id: string) => boolean;
  count: number;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const {
    isMultiSelect,
    selectedIds,
    selectedCount,
    toggleSelect,
    selectAll: selectAllFn,
    clearSelection,
    toggleBatchMode,
    isSelected: isSelectedFn
  } = useSelectionLogic();

  const value: SelectionContextValue = useMemo(() => ({
    state: {
      selectedIds,
      mode: isMultiSelect ? 'batch' : 'single',
      isSelecting: selectedIds.length > 0
    },
    select: (id: string) => {
      if (!selectedIds.includes(id)) toggleSelect(id);
    },
    unselect: (id: string) => {
      if (selectedIds.includes(id)) toggleSelect(id);
    },
    toggle: toggleSelect,
    selectAll: selectAllFn,
    clear: clearSelection,
    toggleMode: toggleBatchMode,
    isSelected: isSelectedFn,
    count: selectedCount
  }), [
    isMultiSelect,
    selectedIds,
    selectedCount,
    toggleSelect,
    selectAllFn,
    clearSelection,
    toggleBatchMode,
    isSelectedFn
  ]);

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
}
