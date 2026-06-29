// src/services/selection/selectionService.ts
import { createStore } from '@storve/core';
import { useStore } from '@/lib/store';
import { signal } from '@storve/core/signals';
import { useSignal } from '@/lib/store';
import { useQueryState } from 'nuqs';
import { batchParser, selectedIdsParser } from '@/lib/nuqs/parsers';

interface SelectionState {
  selectedIds: string[];
  isMultiSelect: boolean;
  batchEditingIds: string[] | null;
  isAvoidingSelection: boolean;
}

const selectionStore = createStore<SelectionState>({
  selectedIds: [],
  isMultiSelect: false,
  batchEditingIds: null,
  isAvoidingSelection: false,
});

export const selectedIdsSignal = signal<SelectionState, 'selectedIds'>(selectionStore, 'selectedIds');
export const isMultiSelectSignal = signal<SelectionState, 'isMultiSelect'>(selectionStore, 'isMultiSelect');

export function useSelection() {
  const [, setBatch] = useQueryState('batch', {
    ...batchParser,
    history: 'replace',
  });

  const [, setSelected] = useQueryState('selected', {
    ...selectedIdsParser,
    history: 'replace',
  });

  const selectedIds = useSignal(selectedIdsSignal);
  const isMultiSelect = useSignal(isMultiSelectSignal);
  const batchEditingIds = useStore(selectionStore, (s) => s.batchEditingIds);
  const isAvoidingSelection = useStore(selectionStore, (s) => s.isAvoidingSelection);
  const selectedCount = selectedIds.length;

  const toggleSelect = (id: string) => {
    selectionStore.setState((state) => {
      const current = state.selectedIds;
      const newIds = current.includes(id)
        ? current.filter((i) => i !== id)
        : [...current, id];
      setSelected(newIds);
      return { 
        selectedIds: newIds,
        isMultiSelect: newIds.length > 0 ? true : state.isMultiSelect
      };
    });
  };

  const clearSelection = () => {
    selectionStore.setState({ selectedIds: [], isMultiSelect: false, batchEditingIds: null });
    setSelected([]);
  };

  const patch = (updates: Partial<SelectionState>) => {
    selectionStore.setState((state) => {
        const nextState = { ...state, ...updates };
        if ('isMultiSelect' in updates && updates.isMultiSelect === false) {
            nextState.selectedIds = [];
        }
        return nextState;
    });
  };

  const toggleMode = () => {
    selectionStore.setState((state) => {
        const newValue = !state.isMultiSelect;
        setBatch(newValue);
        if (!newValue) {
            return { isMultiSelect: newValue, selectedIds: [] };
        }
        return { isMultiSelect: newValue };
    });
  };

  return {
    selectedIds,
    isMultiSelect,
    batchEditingIds,
    isAvoidingSelection,
    selectedCount,
    toggleSelect,
    clearSelection,
    toggleMode,
    patch,
  };
}
