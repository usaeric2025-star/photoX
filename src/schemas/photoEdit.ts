import { type } from 'arktype';

// ✅ 編輯 Schema（只驗證 UI 可編輯欄位）
export const EditPhotoSchema = type({
  'name': 'string',
  'description': 'Record<string, string>', // `{ zh: string, en: string, ms: string }`
  'category_id?': 'string | null',
  'manufacturer_id?': 'string | null',
  'group_id?': 'string | null',
  'is_group_cover?': 'boolean',
  'price?': 'string | null',
  'note?': 'string | null',
  'manual_code?': 'string | null',
  'model_number?': 'string | null',
  'dimensions?': 'object | null',
  'is_hidden?': 'boolean',
  'tags?': 'unknown[] | null',
  'item_code?': 'string | null',
});

export type EditFormData = typeof EditPhotoSchema.infer;

// ✅ 儲存 Schema（驗證所有儲存欄位）
export const SavePhotoSchema = type({
  'id': 'string',
  'name': '(string | Record<string, string>) | null',
  'description': '(string | Record<string, string>) | null',
  'category_id?': 'string | number | null',
  'manufacturer_id?': 'string | null',
  'group_id?': 'string | null',
  'is_group_cover?': 'boolean',
  'price?': 'string | null',
  'note?': 'string | null',
  'manual_code?': 'string | null',
  'model_number?': 'string | null',
  'dimensions?': 'object | null',
  'is_hidden?': 'boolean',
  'tags?': 'unknown[] | null',
  'item_code?': 'string | null',
  'updated_at?': 'string',
  'created_at?': 'string',
});

export type SaveData = typeof SavePhotoSchema.infer;

