import { signal } from '@preact/signals-react';
import { useQueryState } from 'nuqs';
import { batchParser, selectedIdsParser } from '#lib/nuqs/parsers.js';
import { useComputed } from '@preact/signals-react';

interface SelectionState {
  selectedIds: string[];
  batchEditingIds: string[] | null;
  isAvoidingSelection: boolean;
}

// These signals now act as transient/derived state or for non-URL selection state if needed
export const batchEditingIdsSignal = signal<string[] | null>(null);
export const isAvoidingSelectionSignal = signal<boolean>(false);

export const selectionStore = {
  setTransientState: (updates: Partial<Pick<SelectionState, 'batchEditingIds' | 'isAvoidingSelection'>>) => {
    if (updates.batchEditingIds !== undefined) batchEditingIdsSignal.value = updates.batchEditingIds;
    if (updates.isAvoidingSelection !== undefined) isAvoidingSelectionSignal.value = updates.isAvoidingSelection;
  }
};

/**
 * useSelectionActions: Returns actions that update URL via nuqs.
 */
export function useSelectionActions() {
  const [batch, setBatch] = useQueryState('batch', { ...batchParser, history: 'replace', shallow: true });
  const [selected, setSelected] = useQueryState('selected', { ...selectedIdsParser, history: 'replace', shallow: true });

  const toggleSelect = (id: string) => {
    const selectedIds = selected || [];
    const isSelected = selectedIds.includes(id);
    const newIds = isSelected
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    
    setSelected(newIds.length ? newIds : null);
  };

  const clearSelection = () => {
    setSelected(null);
    batchEditingIdsSignal.value = null;
  };

  const toggleMode = () => {
    const nextMode = !batch;
    
    if (!nextMode) {
      setSelected(null);
    }
    // Update URL via nuqs
    setBatch(nextMode || null);
  };

  const patch = (updates: Partial<SelectionState>) => {
    if (updates.selectedIds !== undefined) {
      setSelected(updates.selectedIds.length ? updates.selectedIds : null);
    }
    selectionStore.setTransientState(updates);
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
 * useSelectionCount: Driven by URL state
 */
export function useSelectionCount() {
  const [selected] = useQueryState('selected', selectedIdsParser);
  return selected?.length || 0;
}

/**
 * useSelectedIds: Driven by URL state
 */
export function useSelectedIds() {
  const [selected] = useQueryState('selected', selectedIdsParser);
  return selected || [];
}

/**
 * useIsPhotoSelected: Atomic subscription to a photo's selection status.
 */
export function useIsPhotoSelected(id: string) {
  const [selected] = useQueryState('selected', selectedIdsParser);
  return selected?.includes(id) || false;
}

