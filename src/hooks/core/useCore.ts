import { useState, useEffect, useRef, useCallback, useTransition, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { initApp, appLoadingAtom, appErrorAtom } from '#src/store/index.js';
import { usePublicSettings } from '#src/hooks/index.js';
import { useAdminMode, usePermission } from './auth/useAuth.js';
import { logger } from '#lib/logger.js';
import { useBrowserLocation } from "wouter/use-browser-location";
import { useAppLang } from '#lib/store/index.js';
import { translations as allTranslations, TranslationType, LanguageCode } from '#src/locales/index.js';
import { ANIMATION_CONFIG } from '#src/constants/config.js';
import { copyToClipboard } from '#src/utils/clipboard.js';
import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

type Translations = Record<string, string> | null | undefined;

/**
 * useTranslation
 */
export function useTranslation() {
  const appLang = useAppLang() as LanguageCode;

  const resolveString = useCallback((translations: Translations, fallback?: string) => {
    if (!translations) return fallback || '';
    return translations[appLang] || translations.en || fallback || '';
  }, [appLang]);

  const uiTranslations = useMemo(() => 
    ((allTranslations || {})[appLang as keyof typeof allTranslations] || (allTranslations || {}).en || {}) as TranslationType
  , [appLang]);
    
  const t = useCallback((key: string, ...args: unknown[]): string => {
    const val = (uiTranslations as unknown as Record<string, unknown>)[key];
    if (val === undefined) return key;
    if (typeof val === 'function') {
      return val(...args);
    }
    return String(val);
  }, [uiTranslations]);

  return useMemo(() => ({ 
    resolveString, 
    t, 
    appLang, 
    lang: appLang, 
    uiTranslations 
  }), [resolveString, t, appLang, uiTranslations]);
}

/**
 * useNormalizedLocation
 */
export const useNormalizedLocation = () => {
  const [location, setLocation] = useBrowserLocation();
  const normalized = location === "/" ? "/" : location.replace(/\/$/, "");
  const setNormalizedLocation = useCallback((to: string, options?: any) => {
    const normalizedTo = to === "/" ? "/" : to.replace(/\/$/, "");
    return setLocation(normalizedTo, options);
  }, [setLocation]);
  return [normalized, setNormalizedLocation] as [string, typeof setNormalizedLocation];
};

/**
 * useAppInit
 */
export function useAppInit() {
  const isAppStoreLoading = useAtomValue(appLoadingAtom);
  const appError = useAtomValue(appErrorAtom) as Error | null;
  const { data: settings, error: settingsError, isLoading: isSettingsLoading } = usePublicSettings();

  useEffect(() => { 
    initApp(); 
  }, []);

  const error = appError || (settingsError as Error | null);
  const isError = !!error;
  const isReady = !isAppStoreLoading;

  useEffect(() => {
    if (isReady && typeof window !== 'undefined') {
      (window as any).__APP_READY__ = true;
      const btns = document.querySelectorAll("button");
      btns.forEach(b => { if (b.innerText.includes("啟動過久")) b.remove(); });
    }
  }, [isReady, isError]);

  return { 
    status: isReady ? (isError ? 'error' : 'success') : 'loading',
    error, isLoading: !isReady, isError, settings, isSettingsLoading
  };
}

/**
 * useIsManagement
 */
export function useIsManagement() {
  const isAdminMode = useAdminMode();
  const { can } = usePermission();
  return isAdminMode && (can('photo:edit') || can('photo:delete') || can('photo:batch-edit'));
}

/**
 * usePerformance
 */
export function usePerformance(name: string, threshold = 10) {
  useEffect(() => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      const duration = end - start;
      if (duration > threshold) {
        logger.debug(`[PERF] ${name} took ${duration.toFixed(2)}ms`);
      }
    };
  }, [name, threshold]);
}

/**
 * useMediaQuery
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const updateMatch = () => setMatches(media.matches);
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

/**
 * useClickOutside
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  events: string[] = ['mousedown', 'touchstart'],
  nodes?: (HTMLElement | null)[]
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const listener = (event: Event) => {
      const { target } = event;
      if (!target || (ref.current && ref.current.contains(target as Node))) return;
      if (nodes && !nodes.every((node) => node && !node.contains(target as Node))) return;
      handler();
    };
    events.forEach((fn) => document.addEventListener(fn, listener));
    return () => events.forEach((fn) => document.removeEventListener(fn, listener));
  }, [handler, events, nodes]);
  return ref;
}

/**
 * useCopyToClipboard
 */
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

/**
 * useLongPress
 */
interface UseLongPressOptions {
  delay?: number;
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  disabled?: boolean;
}
export function useLongPress<T extends HTMLElement = HTMLDivElement>({
  delay = ANIMATION_CONFIG.LONG_DELAY,
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

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    const isTouchEvent = 'touches' in e;
    const now = Date.now();
        
    if (!isTouchEvent && now - lastTouchTimeRef.current < 500) return;
    if (isTouchEvent) lastTouchTimeRef.current = now;
        
    let clientX = isTouchEvent ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    let clientY = isTouchEvent ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
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
  }, [disabled, delay, onLongPress, clearTimer]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !isPressedRef.current || !startCoordsRef.current) return;
        
    let clientX = 'touches' in e ? (e.touches[0]?.clientX || 0) : (e as React.MouseEvent).clientX;
    let clientY = 'touches' in e ? (e.touches[0]?.clientY || 0) : (e as React.MouseEvent).clientY;
        
    const diffX = clientX - startCoordsRef.current.x;
    const diffY = clientY - startCoordsRef.current.y;
        
    if (Math.sqrt(diffX * diffX + diffY * diffY) > 20) {
      isPressedRef.current = false;
      clearTimer();
    }
  }, [disabled, clearTimer]);

  const handleEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    clearTimer();
    if (isPressedRef.current && !isLongPressRef.current && onClick) {
      onClick(e);
    }
    isPressedRef.current = false;
    startCoordsRef.current = null;
  }, [disabled, clearTimer, onClick]);

  const handleLeave = useCallback(() => {
    clearTimer();
    isPressedRef.current = false;
    startCoordsRef.current = null;
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

/**
 * useDebouncedCallback
 */
export function useDebouncedCallback<P extends unknown[], R>(callback: (...args: P) => R, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  useEffect(() => { 
     callbackRef.current = callback; 
   }, [callback]);

  const debouncedFn = (...args: P) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
  };
  (debouncedFn as any).cancel = () => { 
     if (timeoutRef.current) { 
       clearTimeout(timeoutRef.current); 
       timeoutRef.current = null; 
     } 
   };
  return debouncedFn as ((...args: P) => void) & { cancel: () => void };
}

/**
 * useDisclosure
 */
export function useDisclosure(initialState = false) {
  const [opened, setOpened] = useState(initialState);
  const open = useCallback(() => setOpened(true), []);
  const close = useCallback(() => setOpened(false), []);
  const toggle = useCallback(() => setOpened((v) => !v), []);
  return [opened, { open, close, toggle }] as const;
}
