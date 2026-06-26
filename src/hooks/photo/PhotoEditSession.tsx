import { logger } from '@/lib/logger';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import { useAppForm } from '@/lib/form/useAppForm';
import { usePhoto } from './usePhoto';
import { usePhotoEditMutation } from './usePhotoMutations';
import { PhotoEditSchema, type PhotoEditFormData } from '@/schemas/photoEdit';
import { photoEditAdapter } from '@/lib/form';
import { generateItemCode } from '@/services/photo/utils';
import { Photo, Tag } from '@/types';

interface PhotoEditSessionContextValue {
  isDirty: boolean;
  isPending: boolean;
  isSubmitting: boolean;
  commit: (data?: PhotoEditFormData) => Promise<void>;
  discard: () => void;
  form: ReturnType<typeof useAppForm<typeof PhotoEditSchema>>['form'];
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

  const defaultValues = useMemo(() => {
    const p = (photo || {}) as Partial<Photo>;
    return {
      name: toSingleString(p.name),
      description: toMultiObject(p.description),
      category_id: p.category_id ?? null,
      manufacturer_id: p.manufacturer_id ?? null,
      group_id: p.group_id ?? null,
      is_group_cover: p.is_group_cover ?? false,
      price: p.price ?? null,
      note: p.note ?? null,
      manual_code: p.manual_code ?? null,
      model_number: p.model_number ?? null,
      dimensions: p.dimensions ?? null,
      is_hidden: p.is_hidden ?? false,
      tags: p.tags ?? null,
      item_code: p.item_code ?? null,
    } as unknown as PhotoEditFormData;
  }, [photo]);

  const onSubmit = useCallback(async (values: PhotoEditFormData) => {
    // Auto-generate item_code if missing
    if (!values.item_code) {
      const newCode = generateItemCode();
      values.item_code = newCode;
      // We will rely on SWR optimistic updates instead of mutating the form immediately
    }
    
    // Convert using our strict Adapter
    const saveData = photoEditAdapter(values, photoId, {
      tags: photo?.tags?.map((t: Tag) => t.name) ?? null,
      created_at: photo?.created_at,
      updated_at: new Date().toISOString(),
    });
    
    await updateMutation.mutateAsync({
      id: photoId,
      updates: saveData as unknown as Partial<Photo>
    });
    
    onSuccess?.();
  }, [photoId, photo?.tags, photo?.created_at, updateMutation, onSuccess]);

  const formObj = useAppForm({
    schema: PhotoEditSchema,
    defaultValues,
    onSubmit
  });
  
  const handleCommit = useCallback(async (data?: PhotoEditFormData) => {
    if (data) {
        Object.entries(data).forEach(([key, value]) => formObj.form.setFieldValue(key as keyof PhotoEditFormData, value as never));
    }
    
    return await formObj.form.handleSubmit();
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
