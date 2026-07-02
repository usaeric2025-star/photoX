import { createStore } from '@storve/core';
import { useStore } from '#lib/store/index.js';
import { useQueryState } from 'nuqs';
import { batchParser } from '#lib/nuqs/parsers.js';

interface SelectionState {
  selectedIds: string[];
  batchEditingIds: string[] | null;
  isAvoidingSelection: boolean;
}

export const selectionStore = createStore<SelectionState>({
  selectedIds: [],
  batchEditingIds: null,
  isAvoidingSelection: false,
});

/**
 * useSelectionActions: Returns actions that update Store immediately for snappy UI.
 */
export function useSelectionActions() {
  const [batch, setBatch] = useQueryState('batch', { ...batchParser, history: 'replace', shallow: true });

  const toggleSelect = (id: string) => {
    const { selectedIds } = selectionStore.getState();
    const isSelected = selectedIds.includes(id);
    const newIds = isSelected
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    
    selectionStore.setState({ 
      ...selectionStore.getState(),
      selectedIds: newIds,
    });
  };

  const clearSelection = () => {
    selectionStore.setState({ 
      ...selectionStore.getState(),
      selectedIds: [], 
      batchEditingIds: null 
    });
  };

  const toggleMode = () => {
    const nextMode = !batch;
    
    selectionStore.setState({ 
      ...selectionStore.getState(),
      selectedIds: nextMode ? selectionStore.getState().selectedIds : []
    });
    // Update URL via nuqs
    setBatch(nextMode || null);
  };

  const patch = (updates: Partial<SelectionState>) => {
    selectionStore.setState({ ...selectionStore.getState(), ...updates });
  };

  return { toggleSelect, clearSelection, toggleMode, patch };
}

/**
 * useIsMultiSelect: Driven by URL state (batch=true)
 */
export function useIsMultiSelect() {
  const [batch] = useQueryState('batch', batchParser);
  return !!batch;
}

/**
 * useSelectionCount: Atomic subscription to selectedCount.
 */
export function useSelectionCount() {
  return useStore(selectionStore, (s) => s.selectedIds.length);
}

/**
 * useSelectedIds: Atomic subscription to selectedIds.
 */
export function useSelectedIds() {
  return useStore(selectionStore, (s) => s.selectedIds);
}

/**
 * useIsPhotoSelected: Atomic subscription to a photo's selection status.
 * Optimized for large grids to prevent unnecessary re-renders.
 */
export function useIsPhotoSelected(id: string) {
  return useStore(selectionStore, (s) => s.selectedIds.includes(id));
}

