import * as v from 'valibot';

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

export const PhotoEditSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, '標題不能為空'), v.maxLength(100, '標題不能超過100字')),
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
  tags: v.optional(v.nullable(v.array(v.string()))),
  itemCode: v.optional(v.nullable(v.string())),
});

export type PhotoEditFormData = v.InferOutput<typeof PhotoEditSchema>;

