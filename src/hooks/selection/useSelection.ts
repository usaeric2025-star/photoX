import { 
  useIsPhotoSelected,
  useIsMultiSelect,
  useSelectionCount,
  useSelectedIds,
  useSelectionActions,
  selectionStore
} from '#src/services/selection/selectionService.js';
import { useStore } from '#lib/store/index.js';

export { useIsPhotoSelected, useIsMultiSelect, useSelectionCount, useSelectedIds, useSelectionActions };

export function useSelection() {
  const transientState = useStore(selectionStore, (s) => s);
  const actions = useSelectionActions();
  const isMultiSelect = useIsMultiSelect();
  const selectedIds = useSelectedIds();
  const selectedCount = useSelectionCount();

  return {
    isMultiSelect: isMultiSelect,
    selectedIds: selectedIds,
    batchEditingIds: transientState.batchEditingIds,
    isAvoidingSelection: transientState.isAvoidingSelection,
    selectedCount: selectedCount,
    isSelected: (id: string) => selectedIds.includes(id),
    toggleSelect: actions.toggleSelect,
    clearSelection: actions.clearSelection,
    toggleMode: actions.toggleMode,
    patch: actions.patch,
  };
}
