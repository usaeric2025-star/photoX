import { create } from 'zustand';
import type { LightboxSlide, LightboxState, LightboxStore, LightboxConfig } from './types';

export const useLightboxStore = create<LightboxStore>((set) => ({
  isOpen: false,
  slides: [],
  currentIndex: 0,
  config: {
    canDownload: true,
    canZoom: true,
    canThumbnails: true,
    theme: 'dark'
  },
  open: (slides, index = 0, config) => set((state) => ({
    isOpen: true,
    slides,
    currentIndex: index,
    config: { ...state.config, ...config }
  })),
  close: () => set({
    isOpen: false,
    slides: [],
    currentIndex: 0,
  }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
}));

export const useLightbox = () => {
  const store = useLightboxStore();
  return {
    isOpen: store.isOpen,
    slides: store.slides,
    currentIndex: store.currentIndex,
    config: store.config,
    open: store.open,
    close: store.close,
  };
};
