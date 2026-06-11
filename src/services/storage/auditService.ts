import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';
import { withErrorHandling } from '@/lib/error/wrapper';
import { AppResult } from '@/types/api';

export const checkStorageHealth = async (): Promise<AppResult<{ healthy: number, missing: number, orphans: number }>> => {
  return withErrorHandling(async () => {
    const res = await api.storage.audit.$get();
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw ErrorFactory.wrap(new Error((result as any).error || 'Failed to audit storage'), 'auditService');
    }
    return result.data;
  }, 'checkStorageHealth', 'high');
};

export const cleanOrphanedFiles = async (): Promise<AppResult<{ success: boolean, cleanedCount: number }>> => {
  return withErrorHandling(async () => {
    const res = await api.storage.clean.$post();
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw ErrorFactory.wrap(new Error((result as any).error || 'Failed to clean storage'), 'auditService');
    }
    return { success: result.success, cleanedCount: result.data?.cleanedCount || (result as any).cleanedCount };
  }, 'cleanOrphanedFiles', 'high');
};
