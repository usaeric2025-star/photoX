import { withErrorHandling } from './wrapper';
import { AppResult } from '@/types/api';
import { PostgrestError } from '@supabase/supabase-js';
import { ErrorSeverity } from './ErrorFactory';

export const withSupabase = async <T>(
  query: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  context: string,
  severity: ErrorSeverity = 'high',
  options?: { allowNull?: boolean }
): Promise<AppResult<T>> => {
  return withErrorHandling(async () => {
    const { data, error } = await query;
    if (error) throw error;
    if (data === null && !options?.allowNull) {
      throw new Error(`${context}: record not found`);
    }
    return data as T;
  }, context, severity);
};
