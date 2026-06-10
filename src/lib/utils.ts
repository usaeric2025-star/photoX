import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from 'sonner'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * [UI-FEEDBACK] toastWithError
 * Centralized error toast with 'Copy Details' action for better developer experience
 */
export function toastWithError(err: any, title?: string) {
  const message = err?.error?.message || err?.message || '操作失败';
  const detail = JSON.stringify(err, (key, value) => {
    // Avoid circular or too large data if necessary
    if (key === 'stack') return value?.substring(0, 500); 
    return value;
  }, 2);

  toast.error(title || '出错了', {
    description: message.length > 50 ? message.substring(0, 47) + '...' : message,
    action: {
      label: '复制详情',
      onClick: () => {
        navigator.clipboard.writeText(detail);
        toast.success('错误详情已复制到剪贴板');
      }
    },
    duration: 8000
  });
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

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}
