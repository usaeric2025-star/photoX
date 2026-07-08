import * as v from 'valibot';
import { createParser } from 'nuqs';

export function parseWithValibot<T>(schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>) {
  return createParser({
    parse: (value: string) => {
      if (value === '') return null;
      try {
        return v.parse(schema, value);
      } catch {
        return null;
      }
    },
    serialize: (value: T) => String(value),
  });
}
