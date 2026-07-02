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
  const state = useStore(selectionStore, (s) => s);
  const actions = useSelectionActions();
  const isMultiSelect = useIsMultiSelect();
  return {
    isMultiSelect: isMultiSelect,
    selectedIds: state.selectedIds,
    batchEditingIds: state.batchEditingIds,
    isAvoidingSelection: state.isAvoidingSelection,
    selectedCount: state.selectedIds.length,
    isSelected: (id: string) => state.selectedIds.includes(id),
    toggleSelect: actions.toggleSelect,
    clearSelection: actions.clearSelection,
    toggleMode: actions.toggleMode,
    patch: actions.patch,
  };
}
