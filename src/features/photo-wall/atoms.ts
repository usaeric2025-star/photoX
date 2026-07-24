import { atom, getDefaultStore, PrimitiveAtom } from 'jotai';
import type { PhotoListItem } from '#src/types/api.js';

interface PhotoWallState {
  mode: 'admin' | 'public';
  onPhotoClick: ((photo: PhotoListItem) => void) | null;
}

export const photoWallModeAtom = atom<'admin' | 'public'>('public') as PrimitiveAtom<'admin' | 'public'>;
export const onPhotoClickAtom = atom<{ fn: ((photo: PhotoListItem) => void) | null }>({ fn: null }) as PrimitiveAtom<{ fn: ((photo: PhotoListItem) => void) | null }>;

const store = getDefaultStore();

export const photoWallStore = {
  getState: () => ({
    mode: store.get(photoWallModeAtom),
    onPhotoClick: store.get(onPhotoClickAtom).fn,
  }),
  setState: (updates: Partial<PhotoWallState>) => {
    if (updates.mode !== undefined) store.set(photoWallModeAtom, updates.mode);
    if (updates.onPhotoClick !== undefined) store.set(onPhotoClickAtom, { fn: updates.onPhotoClick });
  }
};
