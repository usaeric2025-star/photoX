import React, { createContext, useContext, useMemo, useCallback, useSyncExternalStore } from 'react';
import { useQueryState } from 'nuqs';
import { batchParser, selectedIdsParser } from '#lib/nuqs/parsers.js';
import { SelectionService, batchEditingIdsSignal } from './service.js';

interface SelectionActions {
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  toggleMode: () => void;
  patch: (updates: any) => void;
}

const SelectionActionsContext = createContext<SelectionActions | null>(null);

// Intercept window history to support useSyncExternalStore on URL query params
const listeners = new Set<() => void>();
let isIntercepted = false;

function notify() {
  listeners.forEach((l) => l());
}

function interceptHistory() {
  if (isIntercepted || typeof window === 'undefined') return;
  isIntercepted = true;
  const originalPush = window.history.pushState;
  window.history.pushState = function (...args) {
    originalPush.apply(this, args);
    notify();
  };
  const originalReplace = window.history.replaceState;
  window.history.replaceState = function (...args) {
    originalReplace.apply(this, args);
    notify();
  };
  window.addEventListener('popstate', notify);
}

export function subscribeToUrl(callback: () => void) {
  interceptHistory();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// Extract selected IDs directly from URL search string
function getSelectedIdsFromUrl(): string[] {
  if (typeof window === 'undefined') return [];
  const params = new URLSearchParams(window.location.search);
  const val = params.get('selected');
  if (!val) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(val));
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch (e) {
    // Ignore parse error
  }
  return [];
}

// Module-level cache for referential stability of useSelectedIds
let lastSelectedIds: string[] = [];
let lastUrlSearch = '';

function getCachedSelectedIds(): string[] {
  const currentSearch = window.location.search;
  if (currentSearch === lastUrlSearch) {
    return lastSelectedIds;
  }
  
  const parsed = getSelectedIdsFromUrl();
  const isSame = parsed.length === lastSelectedIds.length && 
                 parsed.every((val, idx) => val === lastSelectedIds[idx]);
                 
  if (!isSame) {
    lastSelectedIds = parsed;
  }
  
  lastUrlSearch = currentSearch;
  return lastSelectedIds;
}

/**
 * SelectionProvider: Exposes memoized, stable selection actions.
 */
export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [batch, setBatch] = useQueryState('batch', { ...batchParser, history: 'replace', shallow: true });
  const [selected, setSelected] = useQueryState('selected', { ...selectedIdsParser, history: 'replace', shallow: true });

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
  const [batch] = useQueryState('batch', batchParser);
  return !!batch;
}

/**
 * useSelectionCount: Driven by URL state with precise subscription.
 */
export function useSelectionCount() {
  const getSnapshot = useCallback(() => {
    return getSelectedIdsFromUrl().length;
  }, []);
  return useSyncExternalStore(subscribeToUrl, getSnapshot, () => 0);
}

/**
 * useSelectedIds: Driven by URL state with precise subscription and referential stability.
 */
export function useSelectedIds() {
  const getSnapshot = useCallback(() => {
    return getCachedSelectedIds();
  }, []);
  return useSyncExternalStore(subscribeToUrl, getSnapshot, () => []);
}

/**
 * useIsPhotoSelected: Atomic subscription to a photo's selection status.
 * Unaffected cards will not re-render when other photo selections change.
 */
export function useIsPhotoSelected(id: string) {
  const getSnapshot = useCallback(() => {
    const selected = getSelectedIdsFromUrl();
    return selected.includes(id);
  }, [id]);
  return useSyncExternalStore(subscribeToUrl, getSnapshot, () => false);
}

export { batchEditingIdsSignal };
