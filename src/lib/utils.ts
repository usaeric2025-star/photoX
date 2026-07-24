import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { generateId } from "#lib/id.js"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateTraceId(): string {
  return generateId();
}

/**
 * Ensures a value is always an array.
 */
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

export function withTimeout<T>(promise: Promise<T>, ms: number, labelOrError?: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    const msg = labelOrError
      ? `Operation [${labelOrError}] timed out after ${ms}ms`
      : `Operation timed out after ${ms}ms`;
    timeoutId = setTimeout(() => reject(new Error(msg)), ms);
  });
  
  const actualPromise = Promise.resolve(promise);
  actualPromise.catch(() => {}); // prevent unhandled rejections if timeout wins

  return Promise.race([actualPromise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}
