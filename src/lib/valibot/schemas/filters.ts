import * as v from 'valibot';

export const SortSchema = v.union([
  v.literal('date'),
  v.literal('name'),
  v.literal('size'),
]);

export const SortOrderSchema = v.union([
  v.literal('asc'),
  v.literal('desc'),
]);

export const FiltersSchema = v.object({
  search: v.string(),
  category: v.string(),
  tags: v.array(v.string()),
  sort: SortSchema,
  order: SortOrderSchema,
});

export type Filters = v.InferOutput<typeof FiltersSchema>;
