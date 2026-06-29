import { createStore } from '@storve/core';
import { useStore } from '@/lib/store';
import { useQueryState } from 'nuqs';
import { batchParser, selectedIdsParser } from '@/lib/nuqs/parsers';
import { useEffect, useRef } from 'react';

interface SelectionState {
  selectedIds: string[];
  isMultiSelect: boolean;
  batchEditingIds: string[] | null;
  isAvoidingSelection: boolean;
}

export const selectionStore = createStore<SelectionState>({
  selectedIds: [],
  isMultiSelect: false,
  batchEditingIds: null,
  isAvoidingSelection: false,
});

/**
 * SelectionSync: Background component to keep Store and URL in sync.
 * Optimized for performance: 
 * 1. Immediate UI state update
 * 2. Debounced URL persistence
 */
export function SelectionSync() {
  const [batch, setBatch] = useQueryState('batch', { ...batchParser, history: 'replace', shallow: true });
  const [selected, setSelected] = useQueryState('selected', { ...selectedIdsParser, history: 'replace', shallow: true });
  
  const isInternalUpdate = useRef(false);

  // 1. Sync from URL to Store (e.g. on load or browser navigation)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const updates: Partial<SelectionState> = {};
    const current = selectionStore.getState();
    
    if (!!batch !== current.isMultiSelect) {
      updates.isMultiSelect = !!batch;
    }
    
    const urlIds = selected || [];
    if (urlIds.length !== current.selectedIds.length || 
        (urlIds.length > 0 && urlIds[0] !== current.selectedIds[0])) {
      // Simple check for efficiency, deep comparison if needed
      updates.selectedIds = urlIds;
    }

    if (Object.keys(updates).length > 0) {
      selectionStore.setState(updates);
    }
  }, [batch, selected]);

  // 2. Sync from Store to URL (debounced for performance)
  useEffect(() => {
    const unsubscribe = selectionStore.subscribe((state) => {
      const timer = setTimeout(() => {
        isInternalUpdate.current = true;
        setBatch(state.isMultiSelect || null);
        setSelected(state.selectedIds.length > 0 ? state.selectedIds : null);
      }, 300);
      return () => clearTimeout(timer);
    });
    return unsubscribe;
  }, [setBatch, setSelected]);

  return null;
}

/**
 * useSelectionActions: Returns actions that update Store immediately for snappy UI.
 */
export function useSelectionActions() {
  const toggleSelect = (id: string) => {
    const { selectedIds, isMultiSelect } = selectionStore.getState();
    const isSelected = selectedIds.includes(id);
    const newIds = isSelected
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    
    selectionStore.setState({ 
      selectedIds: newIds,
      isMultiSelect: newIds.length > 0 ? true : isMultiSelect
    });
  };

  const clearSelection = () => {
    selectionStore.setState({ 
      selectedIds: [], 
      isMultiSelect: false,
      batchEditingIds: null 
    });
  };

  const toggleMode = () => {
    const { isMultiSelect } = selectionStore.getState();
    const nextMode = !isMultiSelect;
    selectionStore.setState({ 
      isMultiSelect: nextMode,
      selectedIds: nextMode ? selectionStore.getState().selectedIds : []
    });
  };

  const patch = (updates: Partial<SelectionState>) => {
    selectionStore.setState(updates);
  };

  return { toggleSelect, clearSelection, toggleMode, patch };
}

/**
 * useIsMultiSelect: Atomic subscription to isMultiSelect status.
 */
export function useIsMultiSelect() {
  return useStore(selectionStore, (s) => s.isMultiSelect);
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

/**
 * useSelection: Compatibility hook (deprecated, use atomic hooks for performance).
 */
export function useSelection() {
  const state = useStore(selectionStore, (s) => s);
  const actions = useSelectionActions();
  return {
    ...state,
    ...actions,
    selectedCount: state.selectedIds.length,
    isSelected: (id: string) => state.selectedIds.includes(id),
  };
}
