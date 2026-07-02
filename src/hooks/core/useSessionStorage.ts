import { logger } from '#lib/logger.js';
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

  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch (error) {
      logger.warn(`Error reading sessionStorage key "${key}":`, error);
      return defaultValue;
    }
  };

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
  }, [getInitialValueInEffect]);

  const setValue = (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(state) : value;
        setState(valueToStore);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        logger.warn(`Error setting sessionStorage key "${key}":`, error);
      }
  };

  const removeValue = () => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
      setState(defaultValue);
    } catch (error) {
      logger.warn(`Error removing sessionStorage key "${key}":`, error);
    }
  };

  return [state, setValue, removeValue];
}
