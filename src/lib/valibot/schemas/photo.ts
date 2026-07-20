import * as v from 'valibot';
import { TranslationType } from '#src/locales/index.js';

const TranslationSchema = v.object({
  zh: v.string(),
  en: v.optional(v.string()),
  ms: v.optional(v.string())
});

const DimensionSchema = v.object({
  label: v.optional(v.nullable(v.string())),
  unit: v.optional(v.nullable(v.string())),
  length: v.optional(v.nullable(v.union([v.number(), v.string()]))),
  width: v.optional(v.nullable(v.union([v.number(), v.string()]))),
  height: v.optional(v.nullable(v.union([v.number(), v.string()]))),
  part: v.optional(v.nullable(v.string())),
  isAi: v.optional(v.nullable(v.boolean())),
  isAiEstimated: v.optional(v.nullable(v.boolean())),
});

const getPhotoEditSchema = (t: TranslationType) => v.object({
  name: v.pipe(v.string(), v.minLength(1, t.titleRequired || 'Required'), v.maxLength(100, t.titleTooLong || 'Too long')),
  description: v.optional(v.nullable(v.union([TranslationSchema, v.string()]))),
  categoryId: v.optional(v.nullable(v.union([v.string(), v.number()]))),
  manufacturerId: v.optional(v.nullable(v.union([v.string(), v.number()]))),
  groupId: v.optional(v.nullable(v.string())),
  isGroupCover: v.optional(v.boolean()),
  price: v.optional(v.nullable(v.union([v.string(), v.number()]))),
  note: v.optional(v.nullable(v.string())),
  manualCode: v.optional(v.nullable(v.union([v.string(), v.number()]))),
  modelNumber: v.optional(v.nullable(v.union([v.string(), v.number()]))),
  dimensions: v.optional(v.nullable(v.array(DimensionSchema))),
  isHidden: v.optional(v.boolean()),
  tags: v.optional(v.nullable(v.array(v.union([v.string(), v.object({ id: v.union([v.string(), v.number()]) })])))),
  itemCode: v.optional(v.nullable(v.string())),
});

export const PhotoEditSchema = getPhotoEditSchema({ titleRequired: 'Required', titleTooLong: 'Too long' } as unknown as TranslationType); // Fallback for types
export type PhotoEditFormData = v.InferOutput<typeof PhotoEditSchema>;
