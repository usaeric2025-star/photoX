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

export const getPhotoEditSchema = (t: TranslationType) => v.object({
  name: v.pipe(v.string(), v.minLength(1, t.titleRequired), v.maxLength(100, t.titleTooLong)),
  description: v.optional(TranslationSchema),
  categoryId: v.optional(v.nullable(v.string())),
  manufacturerId: v.optional(v.nullable(v.string())),
  groupId: v.optional(v.nullable(v.string())),
  isGroupCover: v.optional(v.boolean()),
  price: v.optional(v.nullable(v.string())),
  note: v.optional(v.nullable(v.string())),
  manualCode: v.optional(v.nullable(v.string())),
  modelNumber: v.optional(v.nullable(v.string())),
  dimensions: v.optional(v.nullable(v.array(DimensionSchema))),
  isHidden: v.optional(v.boolean()),
  tags: v.optional(v.nullable(v.array(v.any()))),
  itemCode: v.optional(v.nullable(v.string())),
});

export const PhotoEditSchema = getPhotoEditSchema({ titleRequired: 'Required', titleTooLong: 'Too long' } as unknown as TranslationType); // Fallback for types

export type PhotoEditFormData = v.InferOutput<typeof PhotoEditSchema>;

