import { logger } from '#lib/logger.js';
import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import { useAppForm } from '#lib/forms/useAppForm.js';
import { useCategories, useManufacturers, useTranslation } from '#src/hooks/index.js';
import { usePhoto } from './usePhoto.js';
import { usePhotoMutations } from './usePhotoMutations.js';
import { PhotoEditSchema, type PhotoEditFormData } from '#lib/valibot/schemas/photo.js';
import { photoEditAdapter } from '#lib/forms/index.js';
import { generateItemCode } from '#src/services/photo/utils.js';
import { toSingleString, toMultiObject } from '#lib/forms/utils.js';
import { Photo, Tag } from '#src/types/index.js';

interface PhotoEditSessionContextValue {
  isDirty: boolean;
  isPending: boolean;
  isSubmitting: boolean;
  commit: (data?: PhotoEditFormData) => Promise<void>;
  discard: () => void;
  form: ReturnType<typeof useAppForm<PhotoEditFormData>>['form'];
  photoId: string;
}

export const PhotoEditSessionContext = createContext<PhotoEditSessionContextValue | undefined>(undefined);

interface PhotoEditSessionProps {
  photoId: string;
  children: React.ReactNode;
  onSuccess?: () => void;
}

export const PhotoEditSessionProvider = ({ 
  photoId, 
  children, 
  onSuccess 
}: PhotoEditSessionProps) => {
  const { data: photo, isPending } = usePhoto(photoId);
  const { editPhotoAsync } = usePhotoMutations();
  const { categories = [] } = useCategories();
  const { manufacturers = [] } = useManufacturers();
  const { t } = useTranslation();
  
  const defaultValues = useMemo(() => {
    const p = (photo || {}) as Partial<Photo>;
    return {
      name: toSingleString(p.name),
      description: toMultiObject(p.description),
      categoryId: p.categoryId ?? null,
      manufacturerId: p.manufacturerId ?? null,
      groupId: p.groupId ?? null,
      isGroupCover: p.isGroupCover ?? false,
      price: p.price ?? null,
      note: p.note ?? null,
      manualCode: p.manualCode ?? null,
      modelNumber: p.modelNumber ?? null,
      dimensions: p.dimensions ?? null,
      isHidden: p.isHidden ?? false,
      tags: p.tags ?? null,
      itemCode: p.itemCode ?? null,
    } as unknown as PhotoEditFormData;
  }, [photo]);

  const onSubmit = useCallback(async (values: PhotoEditFormData) => {
    // Validate selections against existing arrays
    if (values.categoryId && !categories.find(c => String(c.id) === String(values.categoryId))) {
      values.categoryId = null;
    }
    if (values.manufacturerId && !manufacturers.find(m => String(m.id) === String(values.manufacturerId))) {
      values.manufacturerId = null;
    }

    // Auto-generate itemCode if missing
    if (!values.itemCode) {
      const newCode = generateItemCode();
      values.itemCode = newCode;
      // We will rely on SWR optimistic updates instead of mutating the form immediately
    }
    
    // Convert using our strict Adapter
    const saveData = photoEditAdapter(values, photoId, {
      tags: Array.isArray(values.tags) 
        ? (values.tags as (Tag | string)[]).map((t) => typeof t === 'object' ? String(t.id ?? '') : String(t)).filter(Boolean) 
        : null,
      createdAt: photo?.createdAt,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);
    
    await editPhotoAsync({
      id: photoId,
      updates: saveData as unknown as Partial<Photo>
    });
    
    showToast.success(t('saveSuccess') || 'Saved successfully');
    
    onSuccess?.();
  }, [photoId, photo?.tags, photo?.createdAt, editPhotoAsync, onSuccess, categories, manufacturers, t]);

  const formObj = useAppForm({
    schema: PhotoEditSchema,
    defaultValues,
    onSubmit
  });
  
  const handleCommit = useCallback(async (data?: PhotoEditFormData) => {
    if (data) {
      Object.entries(data).forEach(([key, value]) => formObj.form.setFieldValue(key as keyof PhotoEditFormData, value as never));
    }
    
    try {
      logger.debug('[PhotoEdit] Committing form data...');
      await formObj.form.handleSubmit();
      
      const state = formObj.form.state;
      const hasErrors = Object.keys(state.errors).length > 0 || (state.fieldMeta && Object.values(state.fieldMeta).some(m => m?.errorMap?.onChange));
      
      if (hasErrors) {
         logger.warn('[PhotoEdit] Form validation failed', state.errors);
         return;
      }
    } catch (err) {
      const error = err as Error;
      logger.error('[PhotoEdit] Commit failed:', error);
      ErrorFactory.handle(error, { context: 'PhotoEdit.commit' });
    }
  }, [formObj]);

  const discard = () => {
    formObj.form.reset();
  };
  
  return (
    <PhotoEditSessionContext.Provider value={{ 
      isDirty: formObj.form.state.isDirty,
      isPending,
      isSubmitting: formObj.form.state.isSubmitting,
      commit: handleCommit, 
      discard,
      form: formObj.form,
      photoId
    }}>
      {children}
    </PhotoEditSessionContext.Provider>
  );
}
