import * as v from 'valibot';

export const PageSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1)
);

export const LimitSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.maxValue(100)
);
