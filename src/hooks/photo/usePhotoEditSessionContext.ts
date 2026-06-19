import { useContext } from 'react';
import { useFormContext } from "el-form-react-hooks";
import { PhotoEditSessionContext } from './PhotoEditSessionProvider';
import { type PhotoFormValues } from '@/schemas/photo';

export const usePhotoEditSessionContext = () => {
  const context = useContext(PhotoEditSessionContext);
  const form = useFormContext<PhotoFormValues>();

  if (!context) {
    throw new Error('usePhotoEditSessionContext must be used within a PhotoEditSessionProvider');
  }

  return {
    ...context,
    form,
  };
};
