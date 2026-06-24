import type { Photo } from '@/types/photo';

export interface LightboxSlide {
  id: string;
  src: string;
  alt?: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  groupName?: string;
  price?: string;
  itemCode?: string;
  original?: unknown; // 原始數據引用
}

export interface LightboxConfig {
  canDownload?: boolean;
  canZoom?: boolean;
  canThumbnails?: boolean;
  theme?: 'dark' | 'light';
}

export interface LightboxState {
  isOpen: boolean;
  slides: LightboxSlide[];
  currentIndex: number;
  config: LightboxConfig;
}

export interface LightboxStore extends LightboxState {
  open: (slides: LightboxSlide[], index?: number, config?: LightboxConfig) => void;
  close: () => void;
  setCurrentIndex: (index: number) => void;
}
