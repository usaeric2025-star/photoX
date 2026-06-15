import { createContext, useCallback, useContext } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { usePhoto } from './usePhoto';
import { usePhotoEditMutation } from './usePhotoMutations';
import { PhotoSchema, type PhotoFormValues } from '@/schemas/photo';
import { showToast } from '@/lib/ui/toast';

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
  const { data: photo, isLoading } = usePhoto(photoId);
  const updateMutation = usePhotoEditMutation();
  
  const form = useForm<PhotoFormValues>({
    resolver: arktypeResolver(PhotoSchema as any), 
    defaultValues: {
      ...photo,
      group_id: photo?.group_id ?? null,
    } as any,
    values: {
      ...photo,
      group_id: photo?.group_id ?? null,
    } as any,
  });
  
  const isDirty = form.formState.isDirty;
  
  const commit = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) {
      const errors = form.formState.errors;
      console.warn('[PhotoEdit] Form Validation Failed:', errors);
      const firstError = Object.values(errors)[0];
      const message = (firstError as any)?.message || '表单验证失败，请检查必填项 / Validation Failed';
      showToast.error(message);
      return;
    }
    
    try {
      const values = form.getValues();
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
    } catch (err: any) {
      console.error('[PhotoEdit] Commit failed:', err);
      // Construct a copyable error summary
      const errorData = {
        message: err.message,
        traceId: err.traceId, // Include traceId if available from ErrorFactory
        photoId,
        formValues: form.getValues(),
        stack: err.stack,
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
    form.reset(photo as any);
  };
  
  if (isLoading || !photo) return null;
  
  return (
    <FormProvider {...form}>
      <PhotoEditSessionContext.Provider value={{ isDirty, isPending: updateMutation.isPending, commit, discard }}>
        {children}
      </PhotoEditSessionContext.Provider>
    </FormProvider>
  );
};
