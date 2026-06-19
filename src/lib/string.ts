export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

export function slugify(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : (value != null ? String(value) : fallback);
}
