import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage sessionStorage state
 * Replaces Mantine's useSessionStorage
 */
export function useSessionStorage<T = string>(options: {
  key: string;
  defaultValue: T;
  getInitialValueInEffect?: boolean;
}): [T, (val: T | ((prev: T) => T)) => void, () => void] {
  const { key, defaultValue, getInitialValueInEffect = true } = options;

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return defaultValue;
    }
  }, [key, defaultValue]);

  const [state, setState] = useState<T>(() => {
    if (getInitialValueInEffect) {
      return defaultValue;
    }
    return readValue();
  });

  useEffect(() => {
    if (getInitialValueInEffect) {
      setState(readValue());
    }
  }, [getInitialValueInEffect, readValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(state) : value;
        setState(valueToStore);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting sessionStorage key "${key}":`, error);
      }
    },
    [key, state]
  );

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
      setState(defaultValue);
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  return [state, setValue, removeValue];
}
