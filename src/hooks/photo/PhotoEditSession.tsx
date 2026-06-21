import { logger } from '@/lib/logger';
import { createContext, useCallback, useContext } from 'react';
import { FormProvider, useForm } from "el-form-react-hooks";
import { usePhoto } from './usePhoto';
import { usePhotoEditMutation } from './usePhotoMutations';
import { EditPhotoSchema, type EditFormData } from '@/schemas/photoEdit';
import { editFormToSaveData } from '@/lib/form/photoEditAdapter';
import { useFormSubmit } from '@/lib/form/useFormSubmit';
import { generateItemCode } from '@/services/photo/utils';
import { Photo } from '@/types';
import { arktypeValidator } from '@/lib/form/arktypeAdapter';

interface PhotoEditSessionContextValue {
  isDirty: boolean;
  isPending: boolean;
  isSubmitting: boolean;
  commit: (data?: EditFormData) => Promise<boolean>;
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
    validator: arktypeValidator(EditPhotoSchema),
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

  const { submit: commit, isLoading: isSubmitting } = useFormSubmit({
    schema: EditPhotoSchema,
    mutationFn: async (values: EditFormData) => {
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
      
      return true;
    },
    onSuccess: () => {
      onSuccess?.();
    },
    successMessage: '照片儲存成功',
    errorMessage: '照片儲存失敗'
  });

  const handleCommit = useCallback(async (data?: EditFormData) => {
    const values = data || form.watch();
    return await commit(values);
  }, [commit, form]);

  const discard = () => {
    form.reset({ values: (photo || {}) as unknown as EditFormData });
  };
  
  // Do not return null to avoid blocking parent modal rendering
  // but provide a loading state indicator if necessary (handled by children)
  
  return (
    <FormProvider form={form as any}>
      <PhotoEditSessionContext.Provider value={{ 
        isDirty, 
        isPending,
        isSubmitting,
        commit: handleCommit, 
        discard,
        form,
        photoId
      }}>
        {children}
      </PhotoEditSessionContext.Provider>
    </FormProvider>
  );
}
