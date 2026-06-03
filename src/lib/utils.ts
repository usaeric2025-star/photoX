import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeArray<T>(arr: unknown): T[] {
  if (!arr) return [];
  if (Array.isArray(arr)) return arr as T[];
  if (typeof arr === 'string') {
    return arr.split(',').map(s => s.trim()).filter(Boolean) as unknown as T[];
  }
  if (typeof arr === 'object' && arr !== null) return [arr as T];
  return [];
}

export function normalizeTagName(name: string): string {
  return name?.trim().toUpperCase() || '';
}

export function normalizeManufacturerName(name: string): string {
  return name?.trim().toUpperCase() || '';
}

export function normalizeSearchQuery(query: string): string {
  return query?.trim() || '';
}

export function getPathFromUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Return pathname (e.g. /photox/public/xxx.webp)
    return parsed.pathname;
  } catch (e) {
    // If it's already a path or invalid URL, return as is
    return url.startsWith('/') ? url : `/${url}`;
  }
}
