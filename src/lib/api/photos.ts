import { api } from '#lib/api';

export async function checkHashExists(hash: string): Promise<boolean> {
  try {
    const res = await api.photos['check-hash'].$get({ query: { hash } });
    if (!res.ok) return false;
    const data = await res.json();
    return data.exists;
  } catch {
    return false;
  }
}
