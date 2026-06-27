import { useSignal } from '@storve/react';
import { selectedIds, isMultiSelect } from '@/lib/store';
import { useQueryState } from 'nuqs';
import { batchParser, selectedIdsParser } from '@/lib/nuqs/parsers';

export function useSelection() {
  // ✅ URL 同步（透過 nuqs）
  const [, setBatch] = useQueryState('batch', {
    ...batchParser,
    history: 'replace',
  });
  const [, setSelected] = useQueryState('selected', {
    ...selectedIdsParser,
    history: 'replace',
  });

  // ✅ 精準訂閱：每個元件只訂閱它需要的 Signal
  const ids = useSignal(selectedIds);
  const isMulti = useSignal(isMultiSelect);

  const toggleSelect = (id: string) => {
    const newIds = ids.includes(id)
      ? ids.filter((i) => i !== id)
      : [...ids, id];
    selectedIds.set(newIds);
    setSelected(newIds);
  };

  const clearSelection = () => {
    selectedIds.set([]);
    setSelected([]);
  };

  const toggleMode = () => {
    const newValue = !isMulti;
    isMultiSelect.set(newValue);
    setBatch(newValue);
    if (!newValue) {
      clearSelection();
    }
  };

  return {
    // ✅ 狀態
    isMultiSelect: isMulti,
    selectedIds: ids,
    selectedCount: ids.length,
    isSelected: (id: string) => ids.includes(id),
    // ✅ 操作方法
    toggleSelect,
    clearSelection,
    toggleMode,
  };
}
