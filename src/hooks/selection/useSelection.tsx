import React, { createContext, useContext, useMemo } from 'react';
import { useQueryState } from 'nuqs';
import { QUERY_PARAMS } from '#lib/nuqs/constants.js';
import { batchParser, selectedIdsParser } from '#lib/nuqs/parsers.js';
import { batchEditingIdsAtom, isAvoidingSelectionAtom } from '#src/store/atoms/ui/uiAtoms.js';
import { getDefaultStore } from 'jotai';

const store = getDefaultStore();

/**
 * SelectionService: 處理非 URL 的瞬態選擇狀態 (Jotai)
 */
export const SelectionService = {
  setBatchEditing: (ids: string[] | null) => {
    store.set(batchEditingIdsAtom, ids);
  },
  setAvoidingSelection: (avoid: boolean) => {
    store.set(isAvoidingSelectionAtom, avoid);
  },
  clearTransient: () => {
    store.set(batchEditingIdsAtom, null);
    store.set(isAvoidingSelectionAtom, false);
  }
};

interface SelectionActions {
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  toggleMode: () => void;
  patch: (updates: any) => void;
}

const SelectionActionsContext = createContext<SelectionActions | null>(null);

/**
 * SelectionProvider: Exposes memoized, stable selection actions.
 */
export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [batch, setBatch] = useQueryState(QUERY_PARAMS.BATCH, { ...batchParser, history: 'replace', shallow: true });
  const [selected, setSelected] = useQueryState(QUERY_PARAMS.SELECTED, { ...selectedIdsParser, history: 'replace', shallow: true });

  const actions = useMemo(() => {
    const toggleSelect = (id: string) => {
      setSelected((prev) => {
        const selectedIds = prev || [];
        const isSelected = selectedIds.includes(id);
        const newIds = isSelected
          ? selectedIds.filter((i) => i !== id)
          : [...selectedIds, id];
        return newIds.length ? newIds : null;
      });
    };

    const clearSelection = () => {
      setSelected(null);
      SelectionService.clearTransient();
    };

    const toggleMode = () => {
      const nextMode = !batch;
      if (!nextMode) setSelected(null);
      setBatch(nextMode || null);
    };

    const patch = (updates: any) => {
      if (updates.selectedIds !== undefined) {
        setSelected(updates.selectedIds.length ? updates.selectedIds : null);
      }
      if (updates.batchEditingIds !== undefined) SelectionService.setBatchEditing(updates.batchEditingIds);
      if (updates.isAvoidingSelection !== undefined) SelectionService.setAvoidingSelection(updates.isAvoidingSelection);
    };

    return { toggleSelect, clearSelection, toggleMode, patch };
  }, [batch, setBatch, setSelected]);

  return (
    <SelectionActionsContext.Provider value={actions}>
      {children}
    </SelectionActionsContext.Provider>
  );
}

/**
 * useSelectionActions: Returns actions that update URL via nuqs.
 */
export function useSelectionActions() {
  const context = useContext(SelectionActionsContext);
  if (!context) {
    throw new Error('useSelectionActions must be used within a SelectionProvider');
  }
  return context;
}

/**
 * useIsMultiSelect: Driven by URL state (batch=true)
 */
export function useIsMultiSelect() {
  const [batch] = useQueryState(QUERY_PARAMS.BATCH, batchParser);
  return !!batch;
}

/**
 * useSelectionCount: Driven by URL state.
 */
export function useSelectionCount() {
  const [selected] = useQueryState(QUERY_PARAMS.SELECTED, selectedIdsParser);
  return selected?.length || 0;
}

/**
 * useSelectedIds: Driven by URL state.
 */
export function useSelectedIds() {
  const [selected] = useQueryState(QUERY_PARAMS.SELECTED, selectedIdsParser);
  return selected || [];
}

/**
 * useIsPhotoSelected: Checks if a photo is selected via URL state.
 */
export function useIsPhotoSelected(id: string) {
  const [selected] = useQueryState(QUERY_PARAMS.SELECTED, selectedIdsParser);
  return selected?.includes(id) || false;
}

export { batchEditingIdsAtom };
