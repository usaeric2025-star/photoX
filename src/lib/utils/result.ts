import type { AppResult } from '@/lib/types/result';

export const ok = <T>(data: T): AppResult<T> => ({ success: true, data });
export const fail = (error: string, code?: string): AppResult<never> => ({ success: false, error, code });
