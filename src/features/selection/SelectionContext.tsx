import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useUIStore } from '@/store/useUIStore';

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
  const selectedIds = useUIStore((s) => s.selectedIds);
  const isMultiSelect = useUIStore((s) => s.isMultiSelect);
  const update = useUIStore((s) => s.update);
  const toggleSelected = useUIStore((s) => s.toggleSelected);
  const updateSelectedIds = useUIStore((s) => s.updateSelectedIds);

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
    update({ isMultiSelect: true });
    updateSelectedIds(ids);
  }, [update, updateSelectedIds]);

  const clear = useCallback(() => {
    update({ isMultiSelect: false, selectedIds: [] });
  }, [update]);

  const toggleMode = useCallback(() => {
    update((s) => ({ isMultiSelect: !s.isMultiSelect }));
  }, [update]);

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
