import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';

export const checkStorageHealth = async (): Promise<{ healthy: number, missing: number, orphans: number }> => {
  const res = await api.storage.audit.$get();
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw ErrorFactory.fatal((result as any).error || 'Failed to audit storage', { context: 'checkStorageHealth' });
  }
  return result.data as any;
};

export const cleanOrphanedFiles = async (): Promise<{ success: boolean, cleanedCount: number }> => {
  const res = await api.storage.clean.$post();
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw ErrorFactory.fatal((result as any).error || 'Failed to clean storage', { context: 'cleanOrphanedFiles' });
  }
  return { success: result.success as boolean, cleanedCount: result.data?.cleanedCount || (result as any).cleanedCount };
};
