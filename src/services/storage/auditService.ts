import { api } from '@/lib/api';
import { ErrorFactory } from '../../lib/error/ErrorFactory';

export const checkStorageHealth = async (): Promise<{ healthy: number, missing: number, orphans: number }> => {
  const res = await api.storage.audit.$get();
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw ErrorFactory.wrap(new Error((result as any).error || 'Failed to audit storage'), 'checkStorageHealth');
  }
  return result.data;
};

export const cleanOrphanedFiles = async (): Promise<{ success: boolean, cleanedCount: number }> => {
  const res = await api.storage.clean.$post();
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw ErrorFactory.wrap(new Error((result as any).error || 'Failed to clean storage'), 'cleanOrphanedFiles');
  }
  return { success: result.success, cleanedCount: result.data?.cleanedCount || (result as any).cleanedCount };
};
