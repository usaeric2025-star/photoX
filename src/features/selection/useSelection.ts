import { useSelection as useSelectionService } from '@/services/selection/selectionService';

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
