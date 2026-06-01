export type InteractionState = {
  selectedIds: Set<string>;
  draggedPhotoId: string | null;
  isMultiSelect: boolean;
};

type InteractionListener = (state: InteractionState) => void;

const listeners = new Set<InteractionListener>();

export const interactionBus = {
  current: {
    selectedIds: new Set<string>(),
    draggedPhotoId: null,
    isMultiSelect: false,
  } as InteractionState,
  
  subscribe: (listener: InteractionListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  emit: () => {
    listeners.forEach(l => l(interactionBus.current));
  },

  update: (ids: Set<string>) => {
    interactionBus.current.selectedIds = ids;
    interactionBus.emit();
  },
  
  toggleSelected: (id: string) => {
    if (interactionBus.current.selectedIds.has(id)) {
      interactionBus.current.selectedIds.delete(id);
    } else {
      interactionBus.current.selectedIds.add(id);
    }
    interactionBus.emit();
  },
  
  setDraggedPhoto: (id: string | null) => {
    interactionBus.current.draggedPhotoId = id;
    interactionBus.emit();
  }
};
