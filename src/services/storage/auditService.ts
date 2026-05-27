import { api } from '@/lib/api';

export const checkStorageHealth = async (): Promise<{ healthy: number, missing: number, orphans: number }> => {
  const res = await api.storage.audit.$get();
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error((result as any).error || 'Failed to audit storage');
  }
  return result.data;
};

export const cleanOrphanedFiles = async (): Promise<{ success: boolean, cleanedCount: number }> => {
  const res = await api.storage.clean.$post();
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error((result as any).error || 'Failed to clean storage');
  }
  return { success: result.success, cleanedCount: result.data?.cleanedCount || (result as any).cleanedCount };
};
