import { logger } from '@/lib/logger';
import { createContext, useCallback, useContext } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { usePhoto } from './usePhoto';
import { usePhotoEditMutation } from './usePhotoMutations';
import { PhotoSchema, type PhotoFormValues } from '@/schemas/photo';
import { showToast } from '@/lib/ui/toast';
import { generateItemCode } from '@/services/photo/utils';

interface PhotoEditSessionContextValue {
  isDirty: boolean;
  isPending: boolean;
  commit: () => Promise<void>;
  discard: () => void;
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
  
  const toSingleString = (val: any) => {
    if (typeof val === 'object' && val !== null) return val.zh || val.en || val.ms || '';
    return val || '';
  };

  const toMultiObject = (val: any) => {
    if (typeof val === 'object' && val !== null) return { zh: val.zh || '', en: val.en || '', ms: val.ms || '' };
    return { zh: val || '', en: '', ms: '' };
  };

  const form = useForm<PhotoFormValues>({
    resolver: arktypeResolver(PhotoSchema as any), 
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
      const message = firstError?.message?.toString() || '表单验证失败，请检查必填项 / Validation Failed';
      showToast.error(message);
      return;
    }
    
    try {
      const values = form.getValues();

      // Auto-generate itemCode if missing
      if (!values.item_code) {
        const newCode = generateItemCode();
        (values as any).item_code = newCode;
        form.setValue('item_code' as any, newCode);
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
        updates: sanitizedUpdates as any
      });
      onSuccess?.();
    } catch (err: unknown) {
      logger.error('[PhotoEdit] Commit failed:', err);
      const typedErr = err instanceof Error ? err : new Error(String(err));
      // Construct a copyable error summary
      const errorData = {
        message: typedErr.message,
        traceId: (err as Record<string, unknown>).traceId,
        photoId,
        formValues: form.getValues(),
        stack: typedErr.stack,
      };
      
      const errorString = JSON.stringify(errorData, null, 2);
      
      showToast.error('保存失败，请检查数据完整性 (Save failed)', {
        description: '错误信息已自动打印至控制台。',
        action: {
          label: '复制错误详情',
          onClick: () => {
             navigator.clipboard.writeText(errorString);
             showToast.success('已复制到剪贴板');
          }
        },
        duration: 8000,
      });
    }
  }, [photoId, form, updateMutation, onSuccess]);
  
  const discard = () => {
    form.reset((photo || {}) as unknown as PhotoFormValues);
  };
  
  // Do not return null to avoid blocking parent modal rendering
  // but provide a loading state indicator if necessary (handled by children)
  
  return (
    <FormProvider {...form}>
      <PhotoEditSessionContext.Provider value={{ 
        isDirty, 
        isPending: updateMutation.isPending || isPending, // Also include loading in isPending
        commit, 
        discard 
      }}>
        {children}
      </PhotoEditSessionContext.Provider>
    </FormProvider>
  );
}
