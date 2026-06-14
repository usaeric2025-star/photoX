import { type } from 'arktype';

export const PhotoSchema = type({
    'id?': 'string',
    'userId?': 'string',
    'name?': '(string | Record<string, string>) | null',
    'description?': '(string | Record<string, string>) | null',
    'description_translations?': 'object | null',
    'category_id?': 'string | null',
    'manufacturer_id?': 'string | null',
    'group_id?': 'string | null',
    'is_group_cover?': 'boolean',
    'is_pinned?': 'boolean',
    'image_url?': 'string | null',
    'thumb_hash?': 'string | null',
    'price?': 'string | null',
    'note?': 'string | null',
    'type?': 'string | null',
    'is_hidden?': 'boolean',
    'item_code?': 'string | null',
    'manual_code?': 'string | null',
    'model_number?': 'string | null',
    'dimensions?': 'object | null',
    'updated_at?': 'string',
    'created_at?': 'string',
    'group_order?': 'number | null',
});

export type PhotoFormValues = typeof PhotoSchema.infer;
