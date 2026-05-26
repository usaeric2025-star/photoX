import { interactionBus, InteractionState } from '@/lib/interactionBus';

/**
 * @remarks
 * Returns a read-only snapshot of interaction state and setters for non-React interaction management.
 */
export const useInteractionBridge = () => {
  return {
    state: interactionBus.current,
    setters: {
      setSelectedIds: interactionBus.setSelectedIds,
      toggleSelected: interactionBus.toggleSelected,
      setDraggedPhoto: interactionBus.setDraggedPhoto,
      setIsMultiSelect: interactionBus.setIsMultiSelect,
    },
  };
};
