import { create } from 'zustand';

export interface LightboxImage {
  id: string;
  src: string;
  alt: string;
  title?: string;
  category?: string;
  categoryPath?: string[];
  metadata?: {
    date?: string;
    resolution?: string;
    size?: number | string;
    tags?: string[];
    description?: string;
    camera?: string;
    lens?: string;
  };
}

interface LightboxState {
  isOpen: boolean;
  images: LightboxImage[];
  currentIndex: number;
  
  open: (images: LightboxImage[], index?: number) => void;
  close: () => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
}

export const useLightboxStore = create<LightboxState>((set, get) => ({
  isOpen: false,
  images: [],
  currentIndex: 0,

  open: (images, index = 0) => set({
    isOpen: true,
    images: images,
    currentIndex: index,
  }),

  close: () => set({ isOpen: false }),

  goTo: (index) => set({ currentIndex: index }),

  next: () => {
    const { currentIndex, images } = get();
    if (images.length === 0) return;
    set({ currentIndex: (currentIndex + 1) % images.length });
  },

  prev: () => {
    const { currentIndex, images } = get();
    if (images.length === 0) return;
    set({ currentIndex: (currentIndex - 1 + images.length) % images.length });
  },
}));
