import { atom, PrimitiveAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { STORAGE_KEYS } from '#lib/storage.js';

// Language
export const appLangAtom = atomWithStorage<'zh' | 'en' | 'ms'>(STORAGE_KEYS.LANG, 'en') as unknown as PrimitiveAtom<'zh' | 'en' | 'ms'>;
export const descLangAtom = atomWithStorage<'zh' | 'en' | 'ms'>(STORAGE_KEYS.DESC_LANG, 'zh') as unknown as PrimitiveAtom<'zh' | 'en' | 'ms'>;

// Status
export const appLoadingAtom = atom<boolean>(true) as PrimitiveAtom<boolean>;
export const appErrorAtom = atom<Error | null>(null) as PrimitiveAtom<Error | null>;
