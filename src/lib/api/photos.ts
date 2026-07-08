import { api } from '#lib/api.js';

export async function checkHashExists(hash: string): Promise<boolean> {
  try {
    const res = await api.photos['check-hash'].$post({ json: { hash } });
    if (!res.ok) return false;
    const data = await res.json() as { success: boolean; data?: { exists: boolean } };
    return !!(data.success && data.data?.exists);
  } catch {
    return false;
  }
}
