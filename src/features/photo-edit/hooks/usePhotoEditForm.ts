import { useCallback, useEffect, useMemo } from 'react';
import { useAppForm } from '#lib/forms/useAppForm.js';
import { PhotoEditSchema, type PhotoEditFormData } from '#lib/valibot/schemas/photo.js';
import { Photo, Tag } from '#src/types/index.js';
import { PhotoEditFormService } from '../services/PhotoEditFormService.js';
import { usePhotoMutations } from '#src/hooks/photo/index.js';
import { useTranslation } from '#src/hooks/index.js';
import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useCategories, useManufacturers, useTags } from '#src/hooks/index.js';
import { PhotoAIAdapterRegistry } from '#src/features/ai/types.js';
import { resolveTagNamesToIds } from '#src/features/ai/tagCompletion.js';
import { REGEX } from '#src/constants/config.js';

/**
 * usePhotoEditForm
 * 
 * 封裝照片編輯表單的邏輯。
 */
export function usePhotoEditForm(photoId: string, photo: Photo | null, onSuccess?: () => void) {
  const { t } = useTranslation();
  const { editPhotoAsync } = usePhotoMutations();
  const { categories = [] } = useCategories();
  const { manufacturers = [] } = useManufacturers();
  const { tags: allTags = [] } = useTags();

  const defaultValues = useMemo(() => PhotoEditFormService.getInitialValues(photo), [photo]);

  const onSubmit = useCallback(async (values: PhotoEditFormData) => {
    // 驗證選擇
    if (values.categoryId && !categories.find(c => String(c.id) === String(values.categoryId))) {
      values.categoryId = null;
    }
    if (values.manufacturerId && !manufacturers.find(m => String(m.id) === String(values.manufacturerId))) {
      values.manufacturerId = null;
    }

    const saveData = PhotoEditFormService.prepareSaveData(values, photoId, photo);
    
    await editPhotoAsync({
      id: photoId,
      updates: saveData as unknown as Partial<Photo>
    });
    
    showToast.success(t('saveSuccess') || 'Saved successfully');
    onSuccess?.();
  }, [photoId, photo, editPhotoAsync, onSuccess, categories, manufacturers, t]);

  const formObj = useAppForm({
    schema: PhotoEditSchema,
    defaultValues,
    onSubmit
  });

  const { form } = formObj;

  // 表單數據同步
  useEffect(() => {
    if (photo && !form.state.isDirty) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, photo]);

  // AI 標籤自動回填
  useEffect(() => {
    if (!photo?.metadata?.ai_raw || allTags.length === 0) return;
    
    const currentTags = form.getFieldValue('tags');
    if (currentTags && currentTags.length > 0) return;
    if (defaultValues.tags && defaultValues.tags.length > 0) return;

    const resolveAITags = async () => {
      try {
        let rawJson = photo.metadata!.ai_raw;
        if (typeof rawJson === 'string') {
          const cleanRaw = rawJson.replace(REGEX.MD_JSON_CODE_BLOCK, '').trim();
          rawJson = JSON.parse(cleanRaw);
        }
        
        if (rawJson) {
          const adapter = PhotoAIAdapterRegistry.getAdapter('gemini');
          const normalized = adapter.normalize(rawJson, String(photo.metadata!.ai_raw));
          
          if (normalized.tagNames?.length) {
            const resolvedIds = await resolveTagNamesToIds(normalized.tagNames, allTags);
            const matchedTags = resolvedIds
              .map(id => allTags.find(t => String(t.id) === String(id)))
              .filter(Boolean) as Tag[];
            
            if (matchedTags.length > 0) {
              setTimeout(() => {
                form.setFieldValue('tags', matchedTags);
              }, 100);
            }
          }
        }
      } catch (e) {
        // Silently fail
      }
    };
    resolveAITags();
  }, [photo, allTags, form, defaultValues.tags]);

  const commit = useCallback(async (data?: PhotoEditFormData) => {
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        form.setFieldValue(key as keyof PhotoEditFormData, value as never);
      });
    }

    try {
      await form.handleSubmit();
      const state = form.state;
      
      const errorList: string[] = [];
      if (state.errors && state.errors.length > 0) {
        state.errors.forEach(err => errorList.push(String(err)));
      }
      if (state.fieldMeta) {
        Object.entries(state.fieldMeta).forEach(([fieldName, meta]) => {
          if (meta?.errorMap) {
            Object.values(meta.errorMap).forEach(err => {
              if (err) {
                errorList.push(`${fieldName}: ${String(err)}`);
              }
            });
          }
        });
      }

      if (errorList.length > 0) {
        showToast.error(`${t('saveFailed') || '保存失败'}: ${errorList.join(', ')}`);
        return;
      }
    } catch (err) {
      ErrorFactory.handle(err as Error, { context: 'PhotoEdit.commit' });
    }
  }, [form, t]);

  const discard = useCallback(() => {
    form.reset();
  }, [form]);

  return { form, commit, discard };
}
