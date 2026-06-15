import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useInvalidatePhotos } from '@/hooks';
import { useEffect } from 'react';
import { isEqual } from 'lodash-es';
import { Photo, ProductFormData } from '@/types';
import { useFormDraft } from '@/hooks';
import { useMutation } from '@tanstack/react-query';
import { updatePhoto } from '@/services/photo/commands/update';
import { showToast } from '@/lib/ui/toast';
import { PhotoEditFormReturn } from './types';

/**
 * usePhotoEdit
 * 合併了表單編輯邏輯與提交邏輯。
 * 替換了原有的 usePhotoEditForm 與 usePhotoAction。
 */
export function usePhotoEdit(initialPhoto: Photo | null): PhotoEditFormReturn {
  
  const invalidatePhotos = useInvalidatePhotos();
  
  const emptyPhoto: ProductFormData = {
    name: { zh: '', en: '', ms: '' },
    description: { zh: '', en: '', ms: '' },
    category_id: null,
    manufacturer_id: null,
    tags: [],
    item_code: '',
    manual_code: '',
    model_number: '',
    dimensions: [],
    is_hidden: false,
    price: '',
    is_group_cover: false,
  };

  const initialValues = initialPhoto ? {
    ...emptyPhoto,
    ...initialPhoto,
    name: typeof initialPhoto.name === 'object' 
      ? { zh: '', en: '', ms: '', ...initialPhoto.name as any }
      : { zh: String(initialPhoto.name || ''), en: '', ms: '' },
    description: typeof initialPhoto.description === 'object'
      ? { zh: '', en: '', ms: '', ...initialPhoto.description as any }
      : { zh: String(initialPhoto.description || ''), en: '', ms: '' },
  } : emptyPhoto;

  const { draft, updateDraft, resetDraft } = useFormDraft<ProductFormData>(initialValues as ProductFormData);

  // 當外部照片（以及其詳細屬性）載入完成或切換時，同步重設草稿表單值，使其保持最新
  useEffect(() => {
    resetDraft();
  }, [initialPhoto, resetDraft]);

  const mutation = useMutation({
    mutationFn: async (formData: ProductFormData) => {
      if (!initialPhoto?.id) throw new Error('No photo ID provided');
      return await updatePhoto(initialPhoto.id, formData);
    },
    onSuccess: () => {
      showToast.success('保存成功');
      invalidatePhotos();
    },
    onError: (err) => {
      ErrorFactory.handle(err, `保存失敗: ${err.message}`);
    }
  });

  const save = async () => {
    return mutation.mutateAsync(draft);
  };

  return {
    // 狀態
    values: draft,
    isPending: mutation.isPending,
    isDirty: !isEqual(draft, initialValues),
    
    // 操作
    setValues: updateDraft,
    setFieldValue: (field: keyof ProductFormData, value: any) => updateDraft({ [field]: value }),
    reset: resetDraft,
    save
  } as any;
}
