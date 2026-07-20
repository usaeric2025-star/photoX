import { useQueryState } from 'nuqs';
import { useCallback, useMemo } from 'react';
import { QUERY_PARAMS } from '#lib/nuqs/constants.js';
import { batchParser, selectedIdsParser } from '#lib/nuqs/parsers.js';
import { isAvoidingSelectionAtom } from '#src/store/index.js';
import { getDefaultStore } from 'jotai';

const store = getDefaultStore();

/**
 * SelectionService: 處理非 URL 的瞬態選擇狀態 (Jotai)
 */
export const SelectionService = {
  setAvoidingSelection: (avoid: boolean) => {
    store.set(isAvoidingSelectionAtom, avoid);
  },
  reset: () => {
    store.set(isAvoidingSelectionAtom, false);
  }
};

/**
 * useSelectedIds: 唯一真相來源 (URL)
 */
export function useSelectedIds() {
  const [selected] = useQueryState(QUERY_PARAMS.SELECTED, selectedIdsParser);
  return selected || [];
}

/**
 * useIsMultiSelect: 是否處於多選模式
 */
export function useIsMultiSelect() {
  const [batch] = useQueryState(QUERY_PARAMS.BATCH, batchParser);
  return !!batch;
}

/**
 * useSelectionCount: 返回選中數量
 */
export function useSelectionCount() {
  const selected = useSelectedIds();
  return selected.length;
}

/**
 * useSelectionActions: 統一的操作接口
 */
export function useSelectionActions() {
  const [selected, setSelected] = useQueryState(QUERY_PARAMS.SELECTED, { ...selectedIdsParser, history: 'replace', shallow: true });
  const [batch, setBatch] = useQueryState(QUERY_PARAMS.BATCH, { ...batchParser, history: 'replace', shallow: true });

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const current = prev || [];
      const next = current.includes(id) 
        ? current.filter(i => i !== id) 
        : [...current, id];
      return next.length ? next : null;
    });
  }, [setSelected]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    SelectionService.reset();
  }, [setSelected]);

  const toggleMode = useCallback(() => {
    setBatch((prev) => {
      const nextMode = !prev;
      if (!nextMode) setSelected(null);
      return nextMode || null;
    });
  }, [setBatch, setSelected]);

  const patch = useCallback((updates: { 
    selectedIds?: string[] | null; 
    batch?: boolean; 
    isAvoidingSelection?: boolean;
  }) => {
    if (updates.selectedIds !== undefined) {
      setSelected(updates.selectedIds && updates.selectedIds.length ? updates.selectedIds : null);
    }
    if (updates.batch !== undefined) {
      setBatch(updates.batch || null);
    }
    if (updates.isAvoidingSelection !== undefined) {
      SelectionService.setAvoidingSelection(updates.isAvoidingSelection);
    }
  }, [setSelected, setBatch]);

  return {
    toggleSelect,
    clearSelection,
    toggleMode,
    patch,
    selectedIds: selected || [],
    isBatchMode: !!batch
  };
}

/**
 * useIsPhotoSelected: 輔助檢查單個 ID 是否被選中
 */
export function useIsPhotoSelected(id: string) {
  const selected = useSelectedIds();
  return selected.includes(id);
}
