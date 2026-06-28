import * as v from 'valibot';

export const SortSchema = v.union([
  v.literal('date'),
  v.literal('name'),
  v.literal('size'),
  v.literal('newest'),
  v.literal('oldest'),
]);

