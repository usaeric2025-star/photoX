import { type } from 'arktype';

// ✅ 基礎編輯 Schema（定義 UI 可編輯欄位）
const baseEditPhotoSchema = type({
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

// ✅ 編輯 Schema（掛載 safeParse 以相容 el-form-react-hooks）
export const EditPhotoSchema = Object.assign(baseEditPhotoSchema, {
  safeParse(values: any) {
    const out = baseEditPhotoSchema(values);
    if (out instanceof type.errors) {
      const issues = Array.from(out as any).map((err: any) => ({
        path: err.path || [],
        message: err.message || String(err),
      }));
      return {
        success: false,
        error: { issues },
      };
    }
    return {
      success: true,
      data: out,
    };
  }
});

export type EditFormData = typeof baseEditPhotoSchema.infer;

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

