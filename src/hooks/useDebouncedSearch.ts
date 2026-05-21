import { useDebouncedCallback } from 'use-debounce';
import { UI } from '../config/constants';

/**
 * Standard debounced search hook for the application.
 * @param callback Function to execute after the delay
 * @param delay Delay in milliseconds (defaults to UI.DEBOUNCE_DELAY_MS)
 */
export function useDebouncedSearch(
  callback: (value: string) => void,
  delay: number = UI.DEBOUNCE_DELAY_MS
) {
  return useDebouncedCallback(callback, delay, {
    trailing: true,
  });
}
