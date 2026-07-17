import { useState, useEffect, useRef, useCallback } from 'react';
import { storage } from '#lib/storage.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

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
  const readValue = useCallback((): T => {
    try {
      const item = storage.getItem(key);
      return item !== null ? deserialize(item) : defaultValue;
    } catch (error) {
      ErrorFactory.handle(error, { context: `useLocalStorage.read:${key}` });
      return defaultValue;
    }
  }, [key, defaultValue, deserialize]);

  const [value, setValue] = useState<T>(() => getInitialValueInEffect ? defaultValue : readValue());

  useEffect(() => { 
    if (getInitialValueInEffect) setValue(readValue()); 
  }, [getInitialValueInEffect, readValue]);

  const valueRef = useRef<T>(value);
  useEffect(() => { 
    valueRef.current = value; 
  }, [value]);

  const setLocalStorageValue = useCallback((val: T | ((prev: T) => T)) => {
    try {
      const valueToStore = val instanceof Function ? val(valueRef.current) : val;
      setValue(valueToStore);
      storage.setItem(key, serialize(valueToStore));
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

  return [value, setLocalStorageValue, removeLocalStorageValue];
}

// --- Debounced Callback Hook ---
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

// --- Disclosure Hook ---
export function useDisclosure(initialState = false) {
  const [opened, setOpened] = useState(initialState);
  const open = useCallback(() => setOpened(true), []);
  const close = useCallback(() => setOpened(false), []);
  const toggle = useCallback(() => setOpened((v) => !v), []);
  return [opened, { open, close, toggle }] as const;
}
