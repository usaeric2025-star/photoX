import { logger } from '#lib/logger';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import { useAppForm } from '#lib/forms/useAppForm';
import { usePhoto } from './usePhoto';
import { usePhotoEditMutation } from './usePhotoMutations';
import { PhotoEditSchema, type PhotoEditFormData } from '#src/schemas/photoEdit';
import { photoEditAdapter } from '#lib/forms';
import { generateItemCode } from '#src/services/photo/utils';
import { Photo, Tag } from '#src/types';

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
    // Auto-generate itemCode if missing
    if (!values.itemCode) {
      const newCode = generateItemCode();
      values.itemCode = newCode;
      // We will rely on SWR optimistic updates instead of mutating the form immediately
    }
    
    // Convert using our strict Adapter
    const saveData = photoEditAdapter(values, photoId, {
      tags: photo?.tags?.map((t: Tag) => t.name) ?? null,
      createdAt: photo?.createdAt,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);
    
    await updateMutation.mutateAsync({
      id: photoId,
      updates: saveData as unknown as Partial<Photo>
    });
    
    onSuccess?.();
  }, [photoId, photo?.tags, photo?.createdAt, updateMutation, onSuccess]);

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
