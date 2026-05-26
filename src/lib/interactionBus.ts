export type InteractionState = {
  selectedIds: Set<string>;
  draggedPhotoId: string | null;
  isMultiSelect: boolean;
};

export const interactionBus = {
  current: {
    selectedIds: new Set<string>(),
    draggedPhotoId: null,
    isMultiSelect: false,
  } as InteractionState,
  
  setSelectedIds: (ids: Set<string>) => {
    interactionBus.current.selectedIds = ids;
  },
  toggleSelected: (id: string) => {
    if (interactionBus.current.selectedIds.has(id)) {
      interactionBus.current.selectedIds.delete(id);
    } else {
      interactionBus.current.selectedIds.add(id);
    }
  },
  setDraggedPhoto: (id: string | null) => {
    interactionBus.current.draggedPhotoId = id;
  },
  setIsMultiSelect: (isMulti: boolean) => {
    interactionBus.current.isMultiSelect = isMulti;
  },
};
