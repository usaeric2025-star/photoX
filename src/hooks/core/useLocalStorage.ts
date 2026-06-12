import { useState, useCallback, useEffect } from 'react';

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
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? deserialize(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  }, [key, defaultValue, deserialize]);

  const [value, setValue] = useState<T>(() => {
    if (getInitialValueInEffect) return defaultValue;
    return readValue();
  });

  useEffect(() => {
    if (getInitialValueInEffect) {
      setValue(readValue());
    }
  }, [getInitialValueInEffect, readValue]);

  const setLocalStorageValue = useCallback(
    (val: T | ((prev: T) => T)) => {
      try {
        const valueToStore = val instanceof Function ? val(value) : val;
        setValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialize(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, serialize, value]
  );

  const removeLocalStorageValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        setValue(defaultValue);
      }
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

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize, defaultValue]);

  return [value, setLocalStorageValue, removeLocalStorageValue];
}
