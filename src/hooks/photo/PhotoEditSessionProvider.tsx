import { createContext, useCallback, useContext } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { usePhoto } from './usePhoto';
import { usePhotoEditMutation } from './usePhotoMutations';
import { PhotoSchema, type PhotoFormValues } from '@/schemas/photo';

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
    values: photo as any,
  });
  
  const isDirty = form.formState.isDirty;
  
  const commit = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) return;
    
    await updateMutation.mutateAsync({
      id: photoId,
      updates: form.getValues() as any
    });
    onSuccess?.();
  }, [photoId, form, updateMutation, onSuccess]);
  
  const discard = useCallback(() => {
    form.reset(photo as any);
  }, [form, photo]);
  
  if (isLoading || !photo) return null;
  
  return (
    <FormProvider {...form}>
      <PhotoEditSessionContext.Provider value={{ isDirty, isPending: updateMutation.isPending, commit, discard }}>
        {children}
      </PhotoEditSessionContext.Provider>
    </FormProvider>
  );
};
