import { useContext } from 'react';
import { useFormContext, type UseFormRegister, type UseFormWatch, type UseFormSetValue, type Control } from 'react-hook-form';
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
    register: form.register as UseFormRegister<PhotoFormValues>,
    watch: form.watch as UseFormWatch<PhotoFormValues>,
    setValue: form.setValue as UseFormSetValue<PhotoFormValues>,
    control: form.control as Control<PhotoFormValues>,
  };
};
