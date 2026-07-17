import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { User } from '#src/types/index.js';

export const userAtom = atom<User | null>(null);
export const tokenAtom = atom<string | null>(null);
export const authLoadingAtom = atom<boolean>(true);
export const passcodeAtom = atomWithStorage<string>('ais_mock_auth_passcode', '');
