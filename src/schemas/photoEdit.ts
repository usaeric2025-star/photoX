import * as v from 'valibot';

export const TranslationSchema = v.object({
  zh: v.string(),
  en: v.string(),
  ms: v.string()
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
  dimensions: v.optional(v.nullable(v.object({}))),
  is_hidden: v.optional(v.boolean()),
  tags: v.optional(v.nullable(v.array(v.string()))),
  item_code: v.optional(v.nullable(v.string())),
});

export type PhotoEditFormData = v.InferOutput<typeof PhotoEditSchema>;

export const SavePhotoSchema = v.object({
  id: v.string(),
  name: v.union([v.string(), TranslationSchema]),
  description: v.union([v.string(), TranslationSchema]),
  category_id: v.optional(v.nullable(v.union([v.string(), v.number()]))),
  manufacturer_id: v.optional(v.nullable(v.string())),
  group_id: v.optional(v.nullable(v.string())),
  is_group_cover: v.optional(v.boolean()),
  price: v.optional(v.nullable(v.string())),
  note: v.optional(v.nullable(v.string())),
  manual_code: v.optional(v.nullable(v.string())),
  model_number: v.optional(v.nullable(v.string())),
  dimensions: v.optional(v.nullable(v.object({}))),
  is_hidden: v.optional(v.boolean()),
  tags: v.optional(v.nullable(v.array(v.string()))),
  item_code: v.optional(v.nullable(v.string())),
  updated_at: v.optional(v.string()),
  created_at: v.optional(v.string()),
});

export type SaveData = v.InferOutput<typeof SavePhotoSchema>;
