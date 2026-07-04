import { signal } from '@preact/signals-react';
import { useQueryState } from 'nuqs';
import { batchParser } from '#lib/nuqs/parsers.js';
import { useComputed } from '@preact/signals-react';

interface SelectionState {
  selectedIds: string[];
  batchEditingIds: string[] | null;
  isAvoidingSelection: boolean;
}

const selectedIdsSignal = signal<string[]>([]);
const batchEditingIdsSignal = signal<string[] | null>(null);
const isAvoidingSelectionSignal = signal<boolean>(false);

export const selectionStore = {
  getState: () => ({
    selectedIds: selectedIdsSignal.value,
    batchEditingIds: batchEditingIdsSignal.value,
    isAvoidingSelection: isAvoidingSelectionSignal.value,
  }),
  setState: (updates: Partial<SelectionState>) => {
    if (updates.selectedIds !== undefined) selectedIdsSignal.value = updates.selectedIds;
    if (updates.batchEditingIds !== undefined) batchEditingIdsSignal.value = updates.batchEditingIds;
    if (updates.isAvoidingSelection !== undefined) isAvoidingSelectionSignal.value = updates.isAvoidingSelection;
  }
};

/**
 * useSelectionActions: Returns actions that update Store immediately for snappy UI.
 */
export function useSelectionActions() {
  const [batch, setBatch] = useQueryState('batch', { ...batchParser, history: 'replace', shallow: true });

  const toggleSelect = (id: string) => {
    const selectedIds = selectedIdsSignal.value;
    const isSelected = selectedIds.includes(id);
    const newIds = isSelected
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    
    selectedIdsSignal.value = newIds;
  };

  const clearSelection = () => {
    selectedIdsSignal.value = [];
    batchEditingIdsSignal.value = null;
  };

  const toggleMode = () => {
    const nextMode = !batch;
    
    if (!nextMode) {
      selectedIdsSignal.value = [];
    }
    // Update URL via nuqs
    setBatch(nextMode || null);
  };

  const patch = (updates: Partial<SelectionState>) => {
    selectionStore.setState(updates);
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
  return useComputed(() => selectedIdsSignal.value.length).value;
}

/**
 * useSelectedIds: Atomic subscription to selectedIds.
 */
export function useSelectedIds() {
  return selectedIdsSignal.value;
}

/**
 * useIsPhotoSelected: Atomic subscription to a photo's selection status.
 * Optimized for large grids to prevent unnecessary re-renders.
 */
export function useIsPhotoSelected(id: string) {
  return useComputed(() => selectedIdsSignal.value.includes(id)).value;
}

