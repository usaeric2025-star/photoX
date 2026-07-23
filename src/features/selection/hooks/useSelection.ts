import { useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { feedback } from '#lib/feedback.js';
import {
  selectedIdsSetAtom,
  selectedIdsAtom,
  isExitingSelectionAtom,
  isAvoidingSelectionAtom
} from '#src/store/index.js';
import { getDefaultStore } from 'jotai';

const MAX_SELECTED_COUNT = 200;

const store = getDefaultStore();

const SelectionService = {
  setAvoidingSelection: (avoid: boolean) => {
    store.set(isAvoidingSelectionAtom, avoid);
  },
  reset: () => {
    store.set(isAvoidingSelectionAtom, false);
  }
};

/**
 * useSelectedIds: 返回选中的 ID 数组 (来自于 Jotai 原子)
 */
export function useSelectedIds(): string[] {
  return useAtomValue(selectedIdsAtom);
}

/**
 * useSelectedSet: 返回选中的 ID 集合 Set<string> (O(1) 查找)
 */
export function useSelectedSet(): Set<string> {
  return useAtomValue(selectedIdsSetAtom);
}

/**
 * useIsMultiSelect: 是否处于多选模式
 */
export function useIsMultiSelect(): boolean {
  const [searchParams] = useSearchParams();
  const selectedSet = useAtomValue(selectedIdsSetAtom);
  const isBatchParam = searchParams.get('batch') === 'true';

  return isBatchParam || selectedSet.size > 0;
}

/**
 * useSelectionCount: 返回选中数量
 */
export function useSelectionCount(): number {
  const selectedSet = useAtomValue(selectedIdsSetAtom);
  return selectedSet.size;
}

/**
 * useIsExitingSelection: 查询当前是否处于退出锁定状态
 */
export function useIsExitingSelection(): boolean {
  return useAtomValue(isExitingSelectionAtom);
}

/**
 * useSelectionActions: 统一的操作接口
 */
export function useSelectionActions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSet, setSelectedSet] = useAtom(selectedIdsSetAtom);
  const [isExiting, setIsExiting] = useAtom(isExitingSelectionAtom);

  const toggleSelect = useCallback((id: string) => {
    if (isExiting) return;

    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SELECTED_COUNT) {
          feedback.info(`单次最多可选 ${MAX_SELECTED_COUNT} 张照片`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });

    if (searchParams.get('batch') !== 'true') {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('batch', 'true');
        return next;
      }, { replace: true });
    }
  }, [isExiting, setSelectedSet, searchParams, setSearchParams]);

  const clearSelection = useCallback(() => {
    setIsExiting(true);

    setSelectedSet(new Set());

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('batch');
      next.delete('selected');
      return next;
    }, { replace: true });

    setTimeout(() => {
      setIsExiting(false);
    }, 300);
  }, [setIsExiting, setSelectedSet, setSearchParams]);

  const toggleMode = useCallback(() => {
    if (isExiting) return;

    const isBatch = searchParams.get('batch') === 'true';

    if (isBatch || selectedSet.size > 0) {
      clearSelection();
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('batch', 'true');
        return next;
      }, { replace: true });
    }
  }, [isExiting, searchParams, selectedSet.size, clearSelection, setSearchParams]);

  const patch = useCallback((updates: {
    selectedIds?: string[] | null;
    batch?: boolean;
    isAvoidingSelection?: boolean;
  }) => {
    if (updates.isAvoidingSelection !== undefined) {
      SelectionService.setAvoidingSelection(updates.isAvoidingSelection);
    }

    if (updates.selectedIds !== undefined) {
      if (updates.selectedIds && updates.selectedIds.length > 0) {
        let valid = updates.selectedIds;
        if (valid.length > MAX_SELECTED_COUNT) {
          valid = valid.slice(0, MAX_SELECTED_COUNT);
          feedback.info(`已保留前 ${MAX_SELECTED_COUNT} 张照片`);
        }
        setSelectedSet(new Set(valid));
      } else {
        setSelectedSet(new Set());
      }
    }

    if (updates.batch !== undefined) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (updates.batch) next.set('batch', 'true');
        else {
          next.delete('batch');
          next.delete('selected');
        }
        return next;
      }, { replace: true });
    }
  }, [setSelectedSet, setSearchParams]);

  const toggleAll = useCallback((allIds: string[]) => {
    if (isExiting) return;

    setSelectedSet(prev => {
      const next = new Set(prev);
      const currentlySelectedFromList = allIds.filter(id => next.has(id));
      const isAllSelected = currentlySelectedFromList.length === allIds.length && allIds.length > 0;

      if (isAllSelected) {
        allIds.forEach(id => next.delete(id));
      } else {
        for (const id of allIds) {
          if (next.has(id)) continue;
          if (next.size >= MAX_SELECTED_COUNT) {
            feedback.info(`单次最多可选 ${MAX_SELECTED_COUNT} 张照片`);
            break;
          }
          next.add(id);
        }
      }
      return next;
    });

    if (searchParams.get('batch') !== 'true') {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('batch', 'true');
        return next;
      }, { replace: true });
    }
  }, [isExiting, setSelectedSet, searchParams, setSearchParams]);

  const selectedIds = Array.from(selectedSet);
  const isBatchMode = searchParams.get('batch') === 'true' || selectedIds.length > 0;

  return {
    toggleSelect,
    toggleAll,
    clearSelection,
    toggleMode,
    patch,
    selectedIds,
    isBatchMode
  };
}

/**
 * useIsPhotoSelected: 检查单个 ID 是否选中 (O(1) 性能优化)
 */
export function useIsPhotoSelected(id: string): boolean {
  const selectedSet = useSelectedSet();
  return selectedSet.has(id);
}
