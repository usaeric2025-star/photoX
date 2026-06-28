export async function checkHashExists(hash: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/photos/check-hash?hash=${encodeURIComponent(hash)}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.exists;
  } catch {
    return false;
  }
}
