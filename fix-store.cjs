const fs = require('fs');

const code = `import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { type Signal, effect } from '@preact/signals-react';
import { 
  appLang, descLang, groupSettingsOpen, uploadAsGroup, formState, showPassPrompt, 
  isPhotoPickerOpen, photoPickerGroupId, isInitialDataLoading, focusedGroupPhotoId, 
  showWhatsAppChoice, uploadModeDialogOpen, isTaskDrawerOpen, isSidebarOpen, 
  pendingPhotoId, pendingFiles, activeDialogCount, fatalError, totalCount,
  lightboxSlides, lightboxCurrentIndex,
  updateForm, resetForm, incrementDialogCount, decrementDialogCount, setLightboxData, setLightboxIndex, clearLightboxData, patch, setFatalError,
  type UIStoreState
} from '#src/store/uiStore.js';

// UI 状态 (Signals) (Only exporting used ones)
export {
  appLang, descLang, uploadAsGroup, isTaskDrawerOpen, fatalError,
};

// UI Actions
export { setFatalError };

// Export Signals hooks for compatibility
export const useAppLang = () => useSignal(appLang);
export const useDescLang = () => useSignal(descLang);

function isShallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    const arrA = a as unknown[];
    const arrB = b as unknown[];
    if (arrA.length !== arrB.length) return false;
    for (let i = 0; i < arrA.length; i++) {
      if (!Object.is(arrA[i], arrB[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key) || !Object.is(objA[key], objB[key])) return false;
  }
  return true;
}

export function useSignal<T>(sig: Signal<T>): T {
  const subscribe = useCallback((onStoreChange: () => void) => {
    let isInitial = true;
    const unsubscribe = sig.subscribe(() => {
      if (isInitial) {
        isInitial = false;
        return;
      }
      onStoreChange();
    });
    isInitial = false;
    return unsubscribe;
  }, [sig]);

  const getSnapshot = useCallback(() => {
    return sig.value;
  }, [sig]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Compatibility shim for signals
export const isTaskDrawerOpenSignal = isTaskDrawerOpen;

export type { UIStoreState };

// Compatible useUI hook (Reactive with selector support)
export function useUI<T = UIStoreState>(selector?: (state: UIStoreState) => T): T {
  const getUIState = useCallback((): UIStoreState => ({
    appLang: appLang.value,
    descLang: descLang.value,
    groupSettingsOpen: groupSettingsOpen.value,
    uploadAsGroup: uploadAsGroup.value,
    formState: formState.value,
    showPassPrompt: showPassPrompt.value,
    isPhotoPickerOpen: isPhotoPickerOpen.value,
    photoPickerGroupId: photoPickerGroupId.value,
    isInitialDataLoading: isInitialDataLoading.value,
    focusedGroupPhotoId: focusedGroupPhotoId.value,
    showWhatsAppChoice: showWhatsAppChoice.value,
    uploadModeDialogOpen: uploadModeDialogOpen.value,
    isTaskDrawerOpen: isTaskDrawerOpen.value,
    isSidebarOpen: isSidebarOpen.value,
    pendingPhotoId: pendingPhotoId.value,
    pendingFiles: pendingFiles.value,
    activeDialogCount: activeDialogCount.value,
    fatalError: fatalError.value,
    totalCount: totalCount.value,
    lightboxSlides: lightboxSlides.value,
    lightboxCurrentIndex: lightboxCurrentIndex.value,
    patch,
    updateForm,
    resetForm,
    incrementDialogCount,
    decrementDialogCount,
    setLightboxData,
    setLightboxIndex,
    clearLightboxData,
    setFatalError
  }), []);

  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const lastSelectedStateRef = useRef<T | null>(null);

  const getSnapshot = useCallback(() => {
    const rawState = getUIState();
    const currentSelector = selectorRef.current;
    const selected = currentSelector ? currentSelector(rawState) : (rawState as unknown as T);
    if (lastSelectedStateRef.current !== null && isShallowEqual(lastSelectedStateRef.current, selected)) {
      return lastSelectedStateRef.current;
    }
    lastSelectedStateRef.current = selected;
    return selected;
  }, [getUIState]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    let isInitial = true;
    let lastSelected: T | UIStoreState | undefined = undefined;
    const dispose = effect(() => {
      const state = getUIState();
      const currentSelector = selectorRef.current;
      const selected = currentSelector ? currentSelector(state) : (state as unknown as T);
      if (isInitial) {
        lastSelected = selected;
        return;
      }
      if (!isShallowEqual(lastSelected, selected)) {
        lastSelected = selected;
        onStoreChange();
      }
    });
    isInitial = false;
    return dispose;
  }, [getUIState]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Auth and other stores
import { userSignal, authLoadingSignal, initAuth, signIn, signOut, setUser, setLoading, type AuthState } from '#src/store/authStore.js';
import { tasksSignal, activeTaskCountSignal } from '#src/services/task/taskService.js';

// Re-exports
export {
  tasksSignal, activeTaskCountSignal,
};

export function useAuth<T = AuthState>(selector?: (state: AuthState) => T): T {
  const getAuthState = useCallback((): AuthState => ({
    user: userSignal.value,
    isLoading: authLoadingSignal.value,
    init: initAuth,
    signIn,
    signOut,
    setUser,
    setLoading
  }), []);

  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const lastSelectedStateRef = useRef<T | null>(null);

  const getSnapshot = useCallback(() => {
    const rawState = getAuthState();
    const currentSelector = selectorRef.current;
    const selected = currentSelector ? currentSelector(rawState) : (rawState as unknown as T);
    if (lastSelectedStateRef.current !== null && isShallowEqual(lastSelectedStateRef.current, selected)) {
      return lastSelectedStateRef.current;
    }
    lastSelectedStateRef.current = selected;
    return selected;
  }, [getAuthState]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    let isInitial = true;
    let lastSelected: T | AuthState | undefined = undefined;
    const dispose = effect(() => {
      const state = getAuthState();
      const currentSelector = selectorRef.current;
      const selected = currentSelector ? currentSelector(state) : (state as unknown as T);
      if (isInitial) {
        lastSelected = selected;
        return;
      }
      if (!isShallowEqual(lastSelected, selected)) {
        lastSelected = selected;
        onStoreChange();
      }
    });
    isInitial = false;
    return dispose;
  }, [getAuthState]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
`;

fs.writeFileSync('src/lib/store/index.ts', code);
