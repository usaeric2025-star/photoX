import { useState, useCallback, useEffect, useRef } from 'react';
import { storage } from '@/services/storage';

interface UseLocalStorageOptions<T> {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  getInitialValueInEffect?: boolean;
}

/**
 * Custom hook to manage localStorage state
 * Replaces Mantine's useLocalStorage
 */
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
      console.warn(`Error reading localStorage key "${key}":`, error);
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
      console.warn(`[useLocalStorage] Error setting key "${key}":`, error);
    }
  }, [key, serialize]);

  const removeLocalStorageValue = useCallback(() => {
    try {
      storage.remove(key);
      setValue(defaultValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  // Support for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setValue(deserialize(event.newValue));
        } catch (error) {
          console.warn(`Error deserializing synced localStorage key "${key}":`, error);
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

