import { useState, useCallback } from 'react';

/**
 * Custom hook to manage disclosure state (open/close/toggle)
 * Replaces Mantine's useDisclosure
 */
export function useDisclosure(initialState = false) {
  const [opened, setOpened] = useState(initialState);

  const open = useCallback(() => setOpened(true), []);
  const close = useCallback(() => setOpened(false), []);
  const toggle = useCallback(() => setOpened((v) => !v), []);

  return [opened, { open, close, toggle }] as const;
}
