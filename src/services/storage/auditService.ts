export const checkStorageHealth = async (): Promise<{ healthy: number, missing: number, orphans: number }> => {
  const res = await fetch('/api/storage/audit');
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(result.error || 'Failed to audit storage');
  }
  return result.data;
};

export const cleanOrphanedFiles = async (): Promise<{ success: boolean, cleanedCount: number }> => {
  const res = await fetch('/api/storage/clean', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(result.error || 'Failed to clean storage');
  }
  return { success: result.success, cleanedCount: result.data?.cleanedCount || result.cleanedCount };
};
