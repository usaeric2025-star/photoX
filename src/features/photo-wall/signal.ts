import { createStore } from '@storve/core';
import { signal } from '@storve/core/signals';
import type { PhotoListItem } from '#src/types/api.js';

interface PhotoWallState {
  mode: 'admin' | 'public';
  onPhotoClick: ((photo: PhotoListItem) => void) | null;
}

export const photoWallStore = createStore<PhotoWallState>({
  mode: 'public',
  onPhotoClick: null,
});
