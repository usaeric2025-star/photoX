import { withErrorHandling } from './wrapper';
import { AppResult } from '@/types/api';
import { PostgrestError } from '@supabase/supabase-js';
import { ErrorSeverity } from './ErrorFactory';

export const withSupabase = async <T>(
  query: PromiseLike<{ data: T | null; error: PostgrestError | null; count?: number | null }>,
  context: string,
  severity: ErrorSeverity | string = ErrorSeverity.ERROR,
  options?: { allowNull?: boolean }
): Promise<AppResult<T & { count?: number | null }>> => {
  return withErrorHandling(async () => {
    const { data, error, count } = await query;
    if (error) throw error;
    if (data === null && !options?.allowNull && count === undefined) {
      throw new Error(`${context}: record not found`);
    }
    
    // For head: true queries, data is null but count is present
    if (data === null && count !== undefined && count !== null) {
        return { count } as any;
    }
    
    // Merge count into data if possible, or return as property
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        return { ...(data as any), count } as any;
    }
    
    const result = data as any;
    if (result && count !== undefined && count !== null) {
        if (Array.isArray(result)) {
            (result as any).count = count;
        }
    }
    return result as T;
  }, context, severity);
};
