import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useQueryState<T>(
  key: string,
  parserOrConfig: {
    parse: (value: string | null) => T;
    serialize: (value: T) => string;
    history?: string;
    shallow?: boolean;
  },
  options?: any
) {
  const parser = parserOrConfig;
  const opts = options || parserOrConfig;
  const [searchParams, setSearchParams] = useSearchParams();
  const rawValue = searchParams.get(key);
  const value = parser.parse(rawValue);

  const setValue = useCallback(
    (updater: T | ((prev: T) => T) | null | undefined) => {
      setSearchParams(
        (prev) => {
          const current = parser.parse(prev.get(key));
          const next =
            typeof updater === 'function'
              ? (updater as Function)(current)
              : updater;

          if (next === null || next === undefined || next === '' || (Array.isArray(next) && next.length === 0)) {
            prev.delete(key);
          } else {
            prev.set(key, parser.serialize(next));
          }
          return prev;
        },
        { replace: opts?.history === 'replace' || true }
      );
    },
    [key, parser, setSearchParams, opts]
  );

  return [value, setValue] as const;
}

export * from './constants.js';
export * from './parsers.js';
