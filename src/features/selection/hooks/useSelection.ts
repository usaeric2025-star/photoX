import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { isAvoidingSelectionAtom } from '#src/store/index.js';
import { getDefaultStore } from 'jotai';
import { feedback } from '#lib/feedback.js';

const QUERY_PARAMS = {
  BATCH: 'batch',
  SELECTED: 'selected',
} as const;

export const MAX_SELECTED_COUNT = 200;

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
  const [searchParams] = useSearchParams();
  const raw = searchParams.get(QUERY_PARAMS.SELECTED) || '';
  return useMemo(() => {
    if (!raw) return [];
    return raw.split(',').filter(Boolean);
  }, [raw]);
}

/**
 * useSelectedSet: O(1) 集合查找，防止大量相片渲染卡頓
 */
export function useSelectedSet() {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get(QUERY_PARAMS.SELECTED) || '';
  return useMemo(() => {
    if (!raw) return new Set<string>();
    return new Set(raw.split(',').filter(Boolean));
  }, [raw]);
}

/**
 * useIsMultiSelect: 是否處於多選模式
 */
export function useIsMultiSelect() {
  const [searchParams] = useSearchParams();
  return searchParams.get(QUERY_PARAMS.BATCH) === 'true';
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
  const [searchParams, setSearchParams] = useSearchParams();

  const toggleSelect = useCallback((id: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const current = prev.get(QUERY_PARAMS.SELECTED)?.split(',').filter(Boolean) || [];
      const isAlreadySelected = current.includes(id);
      
      let nextIds: string[];
      if (isAlreadySelected) {
        nextIds = current.filter(i => i !== id);
      } else {
        if (current.length >= MAX_SELECTED_COUNT) {
          feedback.info(`單次最多可選擇 ${MAX_SELECTED_COUNT} 張照片`);
          return prev;
        }
        nextIds = [...current, id];
      }
      
      if (nextIds.length) next.set(QUERY_PARAMS.SELECTED, nextIds.join(','));
      else next.delete(QUERY_PARAMS.SELECTED);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearSelection = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(QUERY_PARAMS.SELECTED);
      return next;
    }, { replace: true });
    SelectionService.reset();
  }, [setSearchParams]);

  const toggleMode = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const prevMode = prev.get(QUERY_PARAMS.BATCH) === 'true';
      const nextMode = !prevMode;
      
      if (nextMode) next.set(QUERY_PARAMS.BATCH, 'true');
      else {
        next.delete(QUERY_PARAMS.BATCH);
        next.delete(QUERY_PARAMS.SELECTED);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const patch = useCallback((updates: { 
    selectedIds?: string[] | null; 
    batch?: boolean; 
    isAvoidingSelection?: boolean;
  }) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (updates.selectedIds !== undefined) {
        if (updates.selectedIds && updates.selectedIds.length) {
          let validIds = updates.selectedIds;
          if (validIds.length > MAX_SELECTED_COUNT) {
            validIds = validIds.slice(0, MAX_SELECTED_COUNT);
            feedback.info(`已為您保留前 ${MAX_SELECTED_COUNT} 張照片`);
          }
          next.set(QUERY_PARAMS.SELECTED, validIds.join(','));
        } else {
          next.delete(QUERY_PARAMS.SELECTED);
        }
      }
      if (updates.batch !== undefined) {
        if (updates.batch) next.set(QUERY_PARAMS.BATCH, 'true');
        else next.delete(QUERY_PARAMS.BATCH);
      }
      return next;
    }, { replace: true });

    if (updates.isAvoidingSelection !== undefined) {
      SelectionService.setAvoidingSelection(updates.isAvoidingSelection);
    }
  }, [setSearchParams]);

  const selectedIds = useSelectedIds();
  const isBatchMode = searchParams.get(QUERY_PARAMS.BATCH) === 'true';

  return {
    toggleSelect,
    clearSelection,
    toggleMode,
    patch,
    selectedIds,
    isBatchMode
  };
}

/**
 * useIsPhotoSelected: 輔助檢查單個 ID 是否被選中 (O(1) 優化)
 */
export function useIsPhotoSelected(id: string) {
  const selectedSet = useSelectedSet();
  return selectedSet.has(id);
}
