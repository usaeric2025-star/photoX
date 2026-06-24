import * as v from 'valibot';
import { SavePhotoSchema, type PhotoEditFormData, type SaveData } from '@/schemas/photoEdit';
import { generateItemCode } from '@/services/photo/utils';

export function photoEditAdapter(
  formData: PhotoEditFormData,
  photoId: string,
  additionalData?: {
    tags?: string[] | null;
    created_at?: string;
    updated_at?: string;
  }
): SaveData {
  const result: SaveData = {
    id: photoId,
    name: formData.name,
    description: formData.description ?? { zh: '', en: '', ms: '' },
    category_id: (formData.category_id && formData.category_id.length > 0) ? formData.category_id : null,
    manufacturer_id: (formData.manufacturer_id && formData.manufacturer_id.length > 0) ? formData.manufacturer_id : null,
    group_id: (formData.group_id && formData.group_id.length > 0) ? formData.group_id : null,
    is_group_cover: formData.is_group_cover ?? false,
    price: formData.price ?? null,
    note: formData.note ?? null,
    manual_code: formData.manual_code ?? null,
    model_number: formData.model_number ?? null,
    dimensions: formData.dimensions ?? null,
    is_hidden: formData.is_hidden ?? false,
    tags: additionalData?.tags !== undefined ? additionalData.tags : (formData.tags ?? null),
    item_code: formData.item_code || generateItemCode(),
    created_at: additionalData?.created_at,
    updated_at: additionalData?.updated_at,
  };

  // ✅ 執行時驗證
  const validation = v.safeParse(SavePhotoSchema, result);
  if (!validation.success) {
    throw new Error(`Data validation failed: ${JSON.stringify(validation.issues)}`);
  }

  return result;
}
