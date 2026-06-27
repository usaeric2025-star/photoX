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
  is_ai: v.optional(v.nullable(v.boolean())),
  is_ai_estimated: v.optional(v.nullable(v.boolean())),
});

export const PhotoEditSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, '標題不能為空'), v.maxLength(100, '標題不能超過100字')),
  description: v.optional(TranslationSchema),
  category_id: v.optional(v.nullable(v.string())),
  manufacturer_id: v.optional(v.nullable(v.string())),
  group_id: v.optional(v.nullable(v.string())),
  is_group_cover: v.optional(v.boolean()),
  price: v.optional(v.nullable(v.string())),
  note: v.optional(v.nullable(v.string())),
  manual_code: v.optional(v.nullable(v.string())),
  model_number: v.optional(v.nullable(v.string())),
  dimensions: v.optional(v.nullable(v.array(DimensionSchema))),
  is_hidden: v.optional(v.boolean()),
  tags: v.optional(v.nullable(v.array(v.string()))),
  item_code: v.optional(v.nullable(v.string())),
});

export type PhotoEditFormData = v.InferOutput<typeof PhotoEditSchema>;

