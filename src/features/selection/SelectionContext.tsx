import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useUI, UIStoreState, useSignal } from '@/lib/store';
import { batchModeSignal } from '@/lib/store';

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
  const selectedIds = useUI((s: UIStoreState) => s.selectedIds);
  const isMultiSelect = useSignal(batchModeSignal);
  const patch = useUI((s: UIStoreState) => s.patch);
  const toggleSelected = useUI((s: UIStoreState) => s.toggleSelected);
  const updateSelectedIds = useUI((s: UIStoreState) => s.updateSelectedIds);

  const state: SelectionState = {
    selectedIds,
    mode: isMultiSelect ? 'batch' : 'single',
    isSelecting: selectedIds.length > 0
  };

  const select = useCallback((id: string) => {
    if (!selectedIds.includes(id)) {
      toggleSelected(id);
    }
  }, [selectedIds, toggleSelected]);

  const unselect = useCallback((id: string) => {
    if (selectedIds.includes(id)) {
      toggleSelected(id);
    }
  }, [selectedIds, toggleSelected]);

  const toggle = useCallback((id: string) => {
    toggleSelected(id);
  }, [toggleSelected]);

  const selectAll = useCallback((ids: string[]) => {
    batchModeSignal.set(true);
    updateSelectedIds(ids);
  }, [updateSelectedIds]);

  const clear = useCallback(() => {
    batchModeSignal.set(false);
    patch({ selectedIds: [] });
  }, [patch]);

  const toggleMode = useCallback(() => {
    batchModeSignal.set(!batchModeSignal.get());
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  const value: SelectionContextValue = {
    state,
    select,
    unselect,
    toggle,
    selectAll,
    clear,
    toggleMode,
    isSelected,
    get count() { return selectedIds.length; }
  };

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
