import { signal } from '@preact/signals-react';

/**
 * SelectionState
 * 
 * 瞬態選擇狀態（非 URL 狀態）。
 */
export const batchEditingIdsSignal = signal<string[] | null>(null);
export const isAvoidingSelectionSignal = signal<boolean>(false);

export const SelectionService = {
  setBatchEditing: (ids: string[] | null) => {
    batchEditingIdsSignal.value = ids;
  },
  
  setAvoidingSelection: (avoid: boolean) => {
    isAvoidingSelectionSignal.value = avoid;
  },

  clearTransient: () => {
    batchEditingIdsSignal.value = null;
    isAvoidingSelectionSignal.value = false;
  }
};
