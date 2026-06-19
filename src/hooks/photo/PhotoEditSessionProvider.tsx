import { logger } from '@/lib/logger';
import { createContext, useCallback, useContext } from 'react';
import { FormProvider, useForm } from "el-form-react-hooks";
import { usePhoto } from './usePhoto';
import { usePhotoEditMutation } from './usePhotoMutations';
import { PhotoSchema, type PhotoFormValues } from '@/schemas/photo';
import { showToast } from '@/lib/ui/toast';
import { generateItemCode } from '@/services/photo/utils';
import { Photo } from '@/types';
import { ErrorFactory, handleError } from '@/lib/error/ErrorFactory';

interface PhotoEditSessionContextValue {
  isDirty: boolean;
  isPending: boolean;
  commit: () => Promise<void>;
  discard: () => void;
  form: any;
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

  const form = useForm<PhotoFormValues>({
    schema: PhotoSchema, 
    defaultValues: {
      ...photo,
      name: toSingleString(photo?.name),
      description: toMultiObject(photo?.description),
      group_id: photo?.group_id ?? null,
    } as unknown as PhotoFormValues,
    values: {
      ...photo,
      name: toSingleString(photo?.name),
      description: toMultiObject(photo?.description),
      group_id: photo?.group_id ?? null,
    } as unknown as PhotoFormValues,
  });
  
  const isDirty = form.formState.isDirty;
  
  const commit = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) {
      const errors = form.formState.errors;
      logger.warn('[PhotoEdit] Form Validation Failed:', errors);
      const firstError = Object.values(errors)[0];
      const message = typeof firstError === 'string' ? firstError : '表单验证失败，请检查必填项 / Validation Failed';
      showToast.error(message);
      return;
    }
    
    try {
      const values = form.watch();

      // Auto-generate itemCode if missing
      if (!values.item_code) {
        const newCode = generateItemCode();
        values.item_code = newCode;
        form.setValue('item_code' as Exclude<keyof PhotoFormValues, 'tags'>, newCode);
      }

      // Sanitize undefined/empty fields to null to comply with ArkType/Database constraints
      const sanitizedUpdates = {
        ...values,
        group_id: (values.group_id && values.group_id.length > 0) ? values.group_id : null,
        category_id: (values.category_id && values.category_id.length > 0) ? values.category_id : null,
        manufacturer_id: (values.manufacturer_id && values.manufacturer_id.length > 0) ? values.manufacturer_id : null,
      };

      await updateMutation.mutateAsync({
        id: photoId,
        updates: sanitizedUpdates as unknown as Partial<Photo>
      });
      onSuccess?.();
    } catch (err: unknown) {
      handleError(err, '保存照片数据');
    }
  }, [photoId, form, updateMutation, onSuccess]);
  
  const discard = () => {
    form.reset({ values: (photo || {}) as unknown as PhotoFormValues });
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
        form
      }}>
        {children}
      </PhotoEditSessionContext.Provider>
    </FormProvider>
  );
}
