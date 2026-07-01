import { ErrorFactory } from '#lib/error/ErrorFactory';
import { useState, useCallback, useEffect, useRef } from 'react';
import { storage } from '#src/services/storage';

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

  // Support for cross-tab synchronization
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

