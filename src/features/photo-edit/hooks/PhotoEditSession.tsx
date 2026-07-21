import React, { createContext, useContext } from 'react';
import { usePhoto } from '#src/hooks/photo/index.js';
import { usePhotoEditForm } from './usePhotoEditForm.js';
import { useAppForm } from '#lib/forms/useAppForm.js';
import { PhotoEditFormData } from '#lib/valibot/schemas/photo.js';

interface PhotoEditSessionContextValue {
  isDirty: boolean;
  isPending: boolean;
  isSubmitting: boolean;
  commit: (data?: PhotoEditFormData) => Promise<boolean>;
  discard: () => void;
  form: ReturnType<typeof useAppForm<PhotoEditFormData>>['form'];
  photoId: string;
}

const PhotoEditSessionContext = createContext<PhotoEditSessionContextValue | null>(null);

export const usePhotoEditSessionContext = () => {
  const context = useContext(PhotoEditSessionContext);
  if (!context) {
    throw new Error('usePhotoEditSessionContext must be used within a PhotoEditSessionProvider');
  }
  return context;
};

interface PhotoEditSessionProps {
  photoId: string;
  children: React.ReactNode;
  onSuccess?: () => void;
}

/**
 * PhotoEditSessionProvider
 * 
 * 照片編輯會話容器，負責協調數據獲取與表單狀態。
 */
export const PhotoEditSessionProvider = ({ 
  photoId, 
  children, 
  onSuccess 
}: PhotoEditSessionProps) => {
  const { data: photo, isPending } = usePhoto(photoId);
  const { form, commit, discard } = usePhotoEditForm(photoId, photo || null, onSuccess);
  
  return (
    <PhotoEditSessionContext.Provider value={{ 
      isDirty: form.state.isDirty,
      isPending,
      isSubmitting: form.state.isSubmitting,
      commit, 
      discard,
      form,
      photoId
    }}>
      {children}
    </PhotoEditSessionContext.Provider>
  );
};

export * from '../services/PhotoEditFormService.js';
export * from './usePhotoEditForm.js';
