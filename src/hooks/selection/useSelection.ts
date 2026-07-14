import { useQueryState } from 'nuqs';
import { batchParser, selectedIdsParser } from '#lib/nuqs/parsers.js';
import { SelectionService, batchEditingIdsSignal } from './service.js';

/**
 * useSelectionActions: Returns actions that update URL via nuqs.
 */
export function useSelectionActions() {
  const [batch, setBatch] = useQueryState('batch', { ...batchParser, history: 'replace', shallow: true });
  const [selected, setSelected] = useQueryState('selected', { ...selectedIdsParser, history: 'replace', shallow: true });

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

export { batchEditingIdsSignal };

