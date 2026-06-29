// src/services/selection/selectionService.ts
import { createStore } from '@storve/core';
import { useStore } from '@/lib/store';
import { signal } from '@storve/core/signals';
import { useSignal } from '@/lib/store';
import { useQueryState } from 'nuqs';
import { batchParser, selectedIdsParser } from '@/lib/nuqs/parsers';
import { useEffect } from 'react';

interface SelectionState {
  batchEditingIds: string[] | null;
  isAvoidingSelection: boolean;
}

const selectionStore = createStore<SelectionState>({
  batchEditingIds: null,
  isAvoidingSelection: false,
});

/**
 * useSelection: Selection logic driven directly by URL state.
 * No more useEffect sync - the URL is the Source of Truth.
 */
export function useSelection() {
  const [batch, setBatch] = useQueryState('batch', {
    ...batchParser,
    history: 'replace',
  });

  const [selected, setSelected] = useQueryState('selected', {
    ...selectedIdsParser,
    history: 'replace',
  });

  const isMultiSelect = !!batch;
  const selectedIds = selected || [];
  const batchEditingIds = useStore(selectionStore, (s) => s.batchEditingIds);
  const isAvoidingSelection = useStore(selectionStore, (s) => s.isAvoidingSelection);
  const selectedCount = selectedIds.length;

  const toggleSelect = (id: string) => {
    const current = selectedIds;
    const isSelected = current.includes(id);
    const newIds = isSelected
      ? current.filter((i) => i !== id)
      : [...current, id];
    
    setSelected(newIds.length > 0 ? newIds : null);
    
    // If selecting first item and not in batch mode, enable it
    if (newIds.length > 0 && !isMultiSelect) {
      setBatch(true);
    }
  };

  const clearSelection = () => {
    setSelected(null);
    setBatch(null);
    selectionStore.setState({ batchEditingIds: null });
  };

  const toggleMode = () => {
    const nextMode = !isMultiSelect;
    setBatch(nextMode || null);
    if (!nextMode) {
      setSelected(null);
      selectionStore.setState({ batchEditingIds: null });
    }
  };

  const setBatchEditingIds = (ids: string[] | null) => {
    selectionStore.setState({ batchEditingIds: ids });
  };

  const patch = (updates: { 
    selectedIds?: string[]; 
    isMultiSelect?: boolean;
    batchEditingIds?: string[] | null;
    isAvoidingSelection?: boolean;
  }) => {
    if ('isMultiSelect' in updates) {
      setBatch(updates.isMultiSelect || null);
      if (updates.isMultiSelect === false) {
        setSelected(null);
      }
    }
    if ('selectedIds' in updates) {
      setSelected(updates.selectedIds && updates.selectedIds.length > 0 ? updates.selectedIds : null);
    }
    if ('batchEditingIds' in updates) {
      selectionStore.setState({ batchEditingIds: updates.batchEditingIds });
    }
    if ('isAvoidingSelection' in updates) {
      selectionStore.setState({ isAvoidingSelection: updates.isAvoidingSelection });
    }
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
    setBatchEditingIds,
    isSelected: (id: string) => selectedIds.includes(id),
  };
}
