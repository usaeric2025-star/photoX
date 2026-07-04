import { signal } from '@preact/signals-react';
import type { PhotoListItem } from '#src/types/api.js';

interface PhotoWallState {
  mode: 'admin' | 'public';
  onPhotoClick: ((photo: PhotoListItem) => void) | null;
}

const modeSignal = signal<'admin' | 'public'>('public');
const onPhotoClickSignal = signal<((photo: PhotoListItem) => void) | null>(null);

export const photoWallStore = {
  getState: () => ({
    mode: modeSignal.value,
    onPhotoClick: onPhotoClickSignal.value,
  }),
  setState: (updates: Partial<PhotoWallState>) => {
    if (updates.mode !== undefined) modeSignal.value = updates.mode;
    if (updates.onPhotoClick !== undefined) onPhotoClickSignal.value = updates.onPhotoClick;
  }
};
