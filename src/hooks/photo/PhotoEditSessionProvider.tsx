import { logger } from '@/lib/logger';
import { createContext, useCallback, useContext } from 'react';
import { FormProvider, useForm } from "el-form-react-hooks";
import { usePhoto } from './usePhoto';
import { usePhotoEditMutation } from './usePhotoMutations';
import { EditPhotoSchema, type EditFormData } from '@/schemas/photoEdit';
import { editFormToSaveData } from '@/lib/form/photoEditAdapter';
import { showToast } from '@/lib/ui/toast';
import { generateItemCode } from '@/services/photo/utils';
import { Photo } from '@/types';
import { ErrorFactory } from '@/lib/error';

interface PhotoEditSessionContextValue {
  isDirty: boolean;
  isPending: boolean;
  commit: (e?: React.MouseEvent | React.FormEvent) => Promise<void>;
  discard: () => void;
  form: any;
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
  const isNew = !photoId;
  const { data: photo, isPending } = usePhoto(photoId);
  const updateMutation = usePhotoEditMutation();
  
  const toSingleString = (val: unknown) => {
    if (typeof val === 'object' && val !== null) {
      const v = val as Record<string, string>;
      return v.zh || v.en || v.ms || '';
    }
    return typeof val === 'string' ? val : '';
  };

  const toMultiObject = (val: unknown) => {
    if (typeof val === 'object' && val !== null) {
      const v = val as Record<string, string>;
      return { zh: v.zh || '', en: v.en || '', ms: v.ms || '' };
    }
    const s = typeof val === 'string' ? val : '';
    return { zh: s, en: '', ms: '' };
  };

  const form = useForm<EditFormData>({
    schema: EditPhotoSchema,
    defaultValues: {
      ...photo,
      name: toSingleString(photo?.name),
      description: toMultiObject(photo?.description),
      group_id: photo?.group_id ?? null,
    } as unknown as EditFormData,
    values: {
      ...photo,
      name: toSingleString(photo?.name),
      description: toMultiObject(photo?.description),
      group_id: photo?.group_id ?? null,
    } as unknown as EditFormData,
  });
  
  const isDirty = form.formState.isDirty;
  
  const commit = useCallback(async (e?: React.MouseEvent | React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    const valid = await form.trigger();
    console.log('[PhotoEdit] Form Validation Triggered. valid?', valid, form.formState.errors);
    if (!valid) {
      const errors = form.formState.errors;
      logger.warn('[PhotoEdit] Form Validation Failed:', errors);
      const firstError = Object.values(errors)[0] as any;
      const message = typeof firstError === 'string' ? firstError : (firstError?.message || '表单验证失败，请检查必填项');
      showToast.error(message);
      return;
    }
    
    try {
      const values = form.watch() as EditFormData;
      console.log('[PhotoEdit] Submitting values:', values);

      // Auto-generate item_code if missing
      if (!values.item_code) {
        const newCode = generateItemCode();
        values.item_code = newCode;
        form.setValue('item_code', newCode);
      }

      // Convert using our strict Adapter (fails fast if misaligned)
      const saveData = editFormToSaveData(values, photoId, {
        tags: photo?.tags,
        created_at: photo?.created_at,
        updated_at: new Date().toISOString(),
      });

      await updateMutation.mutateAsync({
        id: photoId,
        updates: saveData as unknown as Partial<Photo>
      });
      showToast.success('保存成功');
      onSuccess?.();
    } catch (err: unknown) {
      console.error('[PhotoEdit] Save failed:', err);
      ErrorFactory.handleError(err, '保存照片数据');
    }
  }, [photoId, form, photo, updateMutation, onSuccess]);
  
  const discard = () => {
    form.reset({ values: (photo || {}) as unknown as EditFormData });
  };
  
  // Do not return null to avoid blocking parent modal rendering
  // but provide a loading state indicator if necessary (handled by children)
  
  return (
    <FormProvider form={form as any}>
      <PhotoEditSessionContext.Provider value={{ 
        isDirty, 
        isPending: updateMutation.isPending || isPending, 
        commit, 
        discard,
        form,
        photoId
      }}>
        {children}
      </PhotoEditSessionContext.Provider>
    </FormProvider>
  );
}
