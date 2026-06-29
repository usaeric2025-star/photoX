import { 
  useSelection as useSelectionService,
  useIsPhotoSelected,
  useIsMultiSelect,
  useSelectionCount,
  useSelectedIds,
  useSelectionActions
} from '@/services/selection/selectionService';

export { useIsPhotoSelected, useIsMultiSelect, useSelectionCount, useSelectedIds, useSelectionActions };

export function useSelection() {
  const service = useSelectionService();

  return {
    isMultiSelect: service.isMultiSelect,
    selectedIds: service.selectedIds,
    batchEditingIds: service.batchEditingIds,
    isAvoidingSelection: service.isAvoidingSelection,
    selectedCount: service.selectedCount,
    isSelected: (id: string) => service.selectedIds.includes(id),
    toggleSelect: service.toggleSelect,
    clearSelection: service.clearSelection,
    toggleMode: service.toggleMode,
    patch: service.patch,
  };
}
