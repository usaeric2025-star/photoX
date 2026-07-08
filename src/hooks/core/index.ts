/**
 * ============================================================================
 * PHOTOX CORE UTILITY HOOKS (扁平化核心基礎 Hooks)
 * ============================================================================
 * 
 * 📌 [設計原則]
 * - 本檔案為 PhotoX 核心通用工具的「唯一真相來源」與扁平化整合。
 * - 嚴禁在此將通用工具（如 useTranslation, useLocalStorage）拆分成多個微型檔案！
 * - 只有具備跨多個領域模組的「純通用、無業務邏輯」之 Hooks 才能放在此處。
 * 
 * 📌 [狀態歸屬]
 * - 這裡的 Hooks 不應包含任何 Server State 或特定業務領域（Photo, Category 等）的數據。
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { useAppLang, useSignal } from '#lib/store/index.js';
import { translations as allTranslations, TranslationType } from '#src/locales/index.js';
import { showToast } from '#lib/ui/toast.js';
import { copyToClipboard } from '#src/utils/clipboard.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { storage } from '#src/services/storage/index.js';
import { logger } from '#lib/logger.js';
import { useAdminMode } from './auth/useAdminMode.js';
import { initializeApp, appLoadingSignal, appErrorSignal } from '#src/store/appStore.js';
import { usePublicSettings } from '#src/hooks/settings/useSettings.js';

// --- Translation Hook ---

type Translations = Record<string, string> | null | undefined;

export function useTranslation() {
  const appLang = useAppLang();

  const resolveString = useCallback((translations: Translations, fallback?: string) => {
    if (!translations) return fallback || '';
    return translations[appLang] || translations.en || fallback || '';
  }, [appLang]);

  const uiTranslations = ((allTranslations || {})[appLang as keyof typeof allTranslations] || (allTranslations || {}).en || {}) as TranslationType;
  
  const t = useCallback((key: string, ...args: unknown[]): string => {
    const val = (uiTranslations as unknown as Record<string, unknown>)[key];
    if (val === undefined) return key;
    if (typeof val === 'function') {
      return val(...args);
    }
    return String(val);
  }, [uiTranslations]);

  return { resolveString, t, appLang, lang: appLang, uiTranslations };
}

// --- Media Query Hook ---

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const media = window.matchMedia(query);
    const updateMatch = () => {
      setMatches(media.matches);
    };

    updateMatch();

    if (media.addEventListener) {
      media.addEventListener('change', updateMatch);
      return () => media.removeEventListener('change', updateMatch);
    } else {
      media.addListener(updateMatch);
      return () => media.removeListener(updateMatch);
    }
  }, [query]);

  return matches;
}

// --- Click Outside Hook ---

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  events: string[] = ['mousedown', 'touchstart'],
  nodes?: (HTMLElement | null)[]) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const listener = (event: Event) => {
      const { target } = event;
      if (!target) return;
      if (ref.current && ref.current.contains(target as Node)) {
        return;
      }
      if (nodes) {
        const isOutsideNodes = nodes.every((node) => node && !node.contains(target as Node));
        if (!isOutsideNodes) return;
      }
      handler();
    };
    events.forEach((fn) => document.addEventListener(fn, listener));
    return () => {
      events.forEach((fn) => document.removeEventListener(fn, listener));
    };
  }, [handler, events, nodes]);
  return ref;
}

// --- Copy To Clipboard Hook ---

interface UseCopyToClipboardOptions {
  timeout?: number;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onCopy?: (text: string) => void;
}

export const useCopyToClipboard = (options?: UseCopyToClipboardOptions) => {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  const copy = useCallback(
    async (text: string) => {
      const success = await copyToClipboard(text, options);
      if (success) {
        setCopied(true);
        if (options?.showToast !== false) {
          showToast.success(options?.successMessage || t('copySuccess'));
        }
        options?.onCopy?.(text);
        setTimeout(() => setCopied(false), 2000);
      } else {
        ErrorFactory.handle(options?.errorMessage || t('copyFailed'), { context: 'clipboard-op' });
      }
    },
    [options, t]
  );
  return { copy, copied };
};

// --- Debounced Callback Hook ---

export function useDebouncedCallback<P extends unknown[], R>(
  callback: (...args: P) => R,
  delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<(...args: P) => R>(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  const debouncedFn = (...args: P) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  };
  (debouncedFn as unknown as { cancel: () => void }).cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  return debouncedFn as ((...args: P) => void) & { cancel: () => void };
}

// --- Disclosure Hook ---

export function useDisclosure(initialState = false) {
  const [opened, setOpened] = useState(initialState);
  const open = useCallback(() => setOpened(true), []);
  const close = useCallback(() => setOpened(false), []);
  const toggle = useCallback(() => setOpened((v) => !v), []);
  return [opened, { open, close, toggle }] as const;
}

// --- Is Management Hook ---

export function useIsManagement() {
  return useAdminMode();
}

// --- Local Storage Hook ---

interface UseLocalStorageOptions<T> {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  getInitialValueInEffect?: boolean;
}

export function useLocalStorage<T = string>({
  key,
  defaultValue,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  getInitialValueInEffect = true,
}: UseLocalStorageOptions<T>): [T, (val: T | ((prev: T) => T)) => void, () => void] {
  const readValue = (): T => {
    try {
      const item = storage.getItem(key);
      return item !== null ? deserialize(item) : defaultValue;
    } catch (error) {
      ErrorFactory.handle(error, { context: `useLocalStorage.read:${key}` });
      return defaultValue;
    }
  };
  const [value, setValue] = useState<T>(() => {
    if (getInitialValueInEffect) return defaultValue;
    return readValue();
  });
  useEffect(() => {
    if (getInitialValueInEffect) {
      setValue(readValue());
    }
  }, [getInitialValueInEffect]);
  const valueRef = useRef<T>(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const setLocalStorageValue = useCallback((val: T | ((prev: T) => T)) => {
    try {
      const valueToStore = val instanceof Function ? val(valueRef.current) : val;
      setValue(valueToStore);
      const serialized = serialize(valueToStore);
      storage.setItem(key, serialized);
    } catch (error) {
      ErrorFactory.handle(error, { context: `useLocalStorage.set:${key}` });
    }
  }, [key, serialize]);
  const removeLocalStorageValue = useCallback(() => {
    try {
      storage.remove(key);
      setValue(defaultValue);
    } catch (error) {
      ErrorFactory.handle(error, { context: `useLocalStorage.remove:${key}` });
    }
  }, [key, defaultValue]);
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setValue(deserialize(event.newValue));
        } catch (error) {
          ErrorFactory.handle(error, { context: `useLocalStorage.sync:${key}` });
        }
      } else if (event.key === key && event.newValue === null) {
        setValue(defaultValue);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [key, deserialize, defaultValue]);
  return [value, setLocalStorageValue, removeLocalStorageValue];
}

// --- Long Press Hook ---

interface UseLongPressOptions {
  delay?: number;
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  disabled?: boolean;
}

export function useLongPress<T extends HTMLElement = HTMLDivElement>({
  delay = 800,
  onLongPress,
  onClick,
  disabled = false,
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const isPressedRef = useRef(false);
  const elementRef = useRef<T | null>(null);
  const startCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      
      const isTouchEvent = 'touches' in e;
      const now = Date.now();
      
      // Ignore mouse events that occur right after a touch event (simulated mouse events)
      if (!isTouchEvent && now - lastTouchTimeRef.current < 500) {
        return;
      }
      
      if (isTouchEvent) {
        lastTouchTimeRef.current = now;
      }
      
      let clientX = 0;
      let clientY = 0;
      if (isTouchEvent) {
        if (e.touches.length > 1) {
          clearTimer();
          isPressedRef.current = false;
          return;
        }
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      startCoordsRef.current = { x: clientX, y: clientY };
      isPressedRef.current = true;
      isLongPressRef.current = false;
      
      timerRef.current = setTimeout(() => {
        if (isPressedRef.current) {
          isLongPressRef.current = true;
          onLongPress(e);
        }
        clearTimer();
      }, delay);
    },
    [disabled, delay, onLongPress, clearTimer]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled || !isPressedRef.current || !startCoordsRef.current) return;
      
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const diffX = clientX - startCoordsRef.current.x;
      const diffY = clientY - startCoordsRef.current.y;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);
      
      // Cancel long press if user swiped/scrolled or dragged more than 20px
      if (distance > 20) {
        clearTimer();
        isPressedRef.current = false;
      }
    },
    [disabled, clearTimer]
  );

  const handleEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      clearTimer();
      if (isPressedRef.current && !isLongPressRef.current && onClick) {
        onClick(e);
      }
      isPressedRef.current = false;
      startCoordsRef.current = null;
    },
    [disabled, clearTimer, onClick]
  );

  const handleLeave = useCallback(() => {
    if (disabled) return;
    clearTimer();
    isPressedRef.current = false;
    startCoordsRef.current = null;
  }, [disabled, clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    onMouseDown: handleStart,
    onMouseMove: handleMove,
    onMouseUp: handleEnd,
    onMouseLeave: handleLeave,
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: handleEnd,
    onTouchCancel: handleLeave,
    ref: elementRef,
  };
}

// --- Performance Hook ---

export function usePerformance(name: string, threshold = 10) {
  const start = performance.now();
  useEffect(() => {
    const end = performance.now();
    const duration = end - start;
    if (duration > threshold) {
      logger.debug(`[PERF] ${name} render took ${duration.toFixed(2)}ms`);
    }
  });
}

// --- App Init Hook ---

export function useAppInit() {
  const isAppStoreLoading = useSignal(appLoadingSignal);
  const appError = useSignal(appErrorSignal);
  const { data: settings, error: settingsError, isLoading: isSettingsLoading } = usePublicSettings();
  useEffect(() => {
    initializeApp();
  }, []);
  const error = appError || (settingsError as Error | null);
  const isError = !!error;
  const isReady = !isAppStoreLoading;
  useEffect(() => {
    if (isReady && !isError) {
      if (typeof window !== 'undefined') {
        (window as any).__APP_READY__ = true;
      }
    }
  }, [isReady, isError]);
  return { 
    status: isReady ? (isError ? 'error' : 'success') : 'loading',
    error, 
    isLoading: !isReady, 
    isError,
    settings,
    isSettingsLoading
  };
}

export * from './auth/index.js';
