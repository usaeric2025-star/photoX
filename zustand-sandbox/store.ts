import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from './storage';

interface StoreState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  appLang: 'zh' | 'en' | 'ms';
  setAppLang: (lang: 'zh' | 'en' | 'ms') => void;
}

export const useSandboxStore = create<StoreState>((set) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  appLang: safeGetItem(STORAGE_KEYS.LANG, 'en', (v) => ['zh', 'en', 'ms'].includes(v) ? v : 'en') as 'zh' | 'en' | 'ms',
  setAppLang: (appLang) => {
    safeSetItem(STORAGE_KEYS.LANG, appLang);
    set({ appLang });
  },
}));

export { useShallow };
