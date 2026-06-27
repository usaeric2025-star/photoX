import { useQueryState } from 'nuqs';
import { useSignal } from '@storve/react';
import { selectedIds, isMultiSelect } from '@/lib/store/ui';
import { batchParser, selectedIdsParser } from '@/lib/nuqs/parsers';

export function useSelectionLogic() {
  // ✅ URL 同步（透過 nuqs）
  const [batch, setBatch] = useQueryState('batch', {
    ...batchParser,
    history: 'replace',
  });
  const [selected, setSelected] = useQueryState('selected', {
    ...selectedIdsParser,
    history: 'replace',
  });

  // ✅ Signal 狀態
  const ids = useSignal(selectedIds);
  const isMulti = useSignal(isMultiSelect);

  // ✅ 操作方法
  const toggleSelect = (id: string) => {
    const newIds = ids.includes(id)
      ? ids.filter((i) => i !== id)
      : [...ids, id];
    selectedIds.set(newIds);
    setSelected(newIds);
  };

  const selectAll = (photoIds: string[]) => {
    selectedIds.set(photoIds);
    setSelected(photoIds);
  };

  const clearSelection = () => {
    selectedIds.set([]);
    setSelected([]);
  };

  const toggleBatchMode = () => {
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
    // ✅ 操作方法
    toggleSelect,
    selectAll,
    clearSelection,
    toggleBatchMode,
    isSelected: (id: string) => ids.includes(id),
  };
}
